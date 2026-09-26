-- Rend le chemin de migration rejouable et convergent (audit P14 k/l).
--
-- POURQUOI CE FICHIER EXISTE
-- 20260927000000 et 20260927000100 forment un couple compensatoire : le premier
-- ajoute par erreur des colonnes/index sur la table "Session" de l'auth Wasp,
-- le second les défait en renommant le modèle applicatif en "UserSession".
-- Sur une base vide (cas de la dev), le couple se solde correctement.
-- Sur une base NON vide, 00000 échoue : ses ADD COLUMN et ses CREATE INDEX ne
-- sont pas gardés, donc P2003 « already exists » dès qu'une colonne ou un index
-- existe déjà.
--
-- CE QUE CE FICHIER NE FAIT PAS, ET POURQUOI
-- Il n'annule PAS le défaut de 00000 : une migration tardive ne peut pas
-- rendre rétroactivement gardée une instruction déjà écrite. Les deux fichiers
-- appliqués ne sont donc PAS modifiés — Prisma compare une empreinte (checksum)
-- de chaque migration déjà jouée, et les réécrire déclencherait une erreur de
-- dérive sur toute base ayant appliqué 00000 et 00100.
--
-- CE QU'IL APPORTE
-- L'ETAT FINAL attendu, garanti quel que soit le chemin d'arrivée :
-- que 00000+00100 ait réussi proprement, qu'ils aient été résolus à la main, ou
-- qu'une base ait été reconstruite à partir de ce seul fichier. toutes les
-- instructions sont idempotentes, donc la migration est rejouable : l'exécuter
-- deux fois ne doit produire ni erreur ni différence de schéma.
--
-- PROCÉDURE OPÉRATOIRE (base où 00000 a échoué à mi-course)
--   1. Constater l'état : SELECT migration_name, finished_at, rolled_back_at
--      FROM _prisma_migrations ORDER BY started_at;
--   2. Si 00000 est marquée en échec, Prisma refuse d'aller plus loin. Marquer
--      l'échec avant de poursuivre :
--        npx prisma migrate resolve --rolled-back 20260927000000_drift_session_vote_totp
--   3. Appliquer : npx prisma migrate deploy
--      -> ce fichier comble alors exactement ce qui manque, puisque tout le
--         reste est déjà en place.
--   4. Vérifier : aucun objet en double, et le diff de schéma est vide.
-- L'opération 2 déclare l'échec de 00000 : elle ne pretend pas l'avoir
-- exécuté. C'est 00800 qui produit l'état final.

--------------------------------------------------------------------------------
-- 1. Colonnes 2FA sur User
--------------------------------------------------------------------------------
-- totp_secret et totp_actif sont posés par une autre migration ; seules les
-- trois colonnes attribuées à 00000 sont traitées ici, et seulement si absentes.
DO $$
DECLARE
    c text;
BEGIN
    FOREACH c IN ARRAY ARRAY[
        'totp_failed_attempts', 'totp_last_used_step', 'totp_locked_until'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'User' AND column_name = c
        ) THEN
            EXECUTE format(
                'ALTER TABLE "User" ADD COLUMN %I %s',
                c,
                CASE c
                    WHEN 'totp_failed_attempts' THEN 'INTEGER NOT NULL DEFAULT 0'
                    WHEN 'totp_last_used_step'  THEN 'BIGINT'
                    WHEN 'totp_locked_until'     THEN 'TIMESTAMP(3)'
                END
            );
        END IF;
    END LOOP;
END $$;

--------------------------------------------------------------------------------
-- 2. Colonne de scopage entreprise sur VoteAntiRejeu
--------------------------------------------------------------------------------
DO $$
DECLARE
    n bigint;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'VoteAntiRejeu' AND column_name = 'id_entreprise'
    ) THEN
        SELECT count(*) INTO n FROM "VoteAntiRejeu";

        -- Aucune donnée ne peut être rattachée honnêtement : la table ne
        -- contient que le hachage du téléphone et la date, jamais l'entreprise.
        -- Attribuer les lignes existantes à une entreprise au hasard
        -- fabriquerait un historique anti-rejeu FAUX, et ce vote sert à
        -- limiter le nombre d'avis par téléphone et par jour : une fausse
        -- entreprise désactive silencieusement la protection. On refuse donc,
        -- et on laisse la décision à celui qui tient la donnée.
        IF n > 0 THEN
            RAISE EXCEPTION
                'VoteAntiRejeu contient % lignes sans id_entreprise, et cette '
                'information n''est pas dérivable de la table. Backfill manuel '
                'requis avant de rejouer cette migration : chaque ligne doit '
                'être rattachée à son entreprise d''origine.', n;
        END IF;

        ALTER TABLE "VoteAntiRejeu" ADD COLUMN "id_entreprise" INTEGER NOT NULL;
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 3. Table UserSession (sessions révocables applicatives)
--------------------------------------------------------------------------------
-- IF NOT EXISTS : sans danger si 00100 l'a déjà créée.
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "tokenHash"  TEXT NOT NULL,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "revokedAt"  TIMESTAMP(3),
    "ip"         TEXT,
    "userAgent"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

--------------------------------------------------------------------------------
-- 4. Index de UserSession
--------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenHash_key"     ON "UserSession"("tokenHash");
CREATE        INDEX IF NOT EXISTS "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");
CREATE        INDEX IF NOT EXISTS "UserSession_expiresAt_idx"     ON "UserSession"("expiresAt");

--------------------------------------------------------------------------------
-- 5. Index de VoteAntiRejeu
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "VoteAntiRejeu_date_vote_idx" ON "VoteAntiRejeu"("date_vote");
CREATE UNIQUE INDEX IF NOT EXISTS "VoteAntiRejeu_id_entreprise_hachage_tel_date_vote_key"
    ON "VoteAntiRejeu"("id_entreprise", "hachage_tel", "date_vote");

--------------------------------------------------------------------------------
-- 6. Clés étrangères
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserSession_userId_fkey'
    ) THEN
        ALTER TABLE "UserSession"
            ADD CONSTRAINT "UserSession_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"(id)
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'VoteAntiRejeu_id_entreprise_fkey'
    ) THEN
        ALTER TABLE "VoteAntiRejeu"
            ADD CONSTRAINT "VoteAntiRejeu_id_entreprise_fkey"
            FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"(id)
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;
