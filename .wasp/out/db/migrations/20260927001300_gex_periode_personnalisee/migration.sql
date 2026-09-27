-- Période d'analyse personnalisée (rapports §14 — hebdo via SEMAINE existante,
-- période libre via PERSONNALISEE).
--
-- 1. L'enum est RECRÉÉ (pattern éprouvé en `20260927001100`) : `ALTER TYPE …
--    ADD VALUE` ne passe pas dans le bloc transactionnel de `migrate deploy`.
--    Aucune donnée existante n'utilise la nouvelle valeur : la conversion
--    `USING …::text::…` est totale par construction.
--
-- 2. L'unicité passe de (entreprise, periode, debut) à (entreprise, periode,
--    debut, fin) : deux analyses personnalisées démarrant le même jour mais
--    finissant différemment coexisteraient sinon par écrasement silencieux
--    (l'upsert remettrait la ligne en PENDING en effaçant la première).
--    Les lignes existantes sont uniques sur la clé courte, donc a fortiori
--    sur la clé longue : aucun conflit possible.
--
-- Noms strictement identiques à ceux que Prisma génère pour que
-- `migrate diff` ne voie aucun drift. `IF NOT EXISTS` / gardes : rejouable.

-- 1. Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PeriodeAnalyse_new') THEN
    CREATE TYPE "PeriodeAnalyse_new" AS ENUM ('SEMAINE', 'MOIS', 'PERSONNALISEE');
  END IF;
END
$$;

ALTER TABLE "GlobalExperienceAnalysis" ALTER COLUMN "periode" TYPE "PeriodeAnalyse_new" USING "periode"::text::"PeriodeAnalyse_new";

ALTER TYPE "PeriodeAnalyse" RENAME TO "PeriodeAnalyse_old";
ALTER TYPE "PeriodeAnalyse_new" RENAME TO "PeriodeAnalyse";
DROP TYPE "PeriodeAnalyse_old";

-- 2. Unicité (entreprise, periode, debut, fin)
DROP INDEX IF EXISTS "GlobalExperienceAnalysis_id_entreprise_periode_debut_key";
CREATE UNIQUE INDEX IF NOT EXISTS "GlobalExperienceAnalysis_id_entreprise_periode_debut_fin_key" ON "GlobalExperienceAnalysis"("id_entreprise", "periode", "debut", "fin");
