-- Vague 1 (scoring) : OptionCritere + ReponseOption + scores nullable.
-- Généré depuis `prisma migrate diff`, EXPURGÉ des DROP sur les tables
-- d'auth gérées par Wasp (Auth/AuthIdentity/Session) — ne jamais appliquer
-- ces DROP (le login en dépend).
-- Rétrocompatible : ajouts NULLables / DEFAULT uniquement, aucune donnée
-- existante modifiée (score_brut passe NULLable sans réécriture).

-- Critere : mode de scoring, orientation, version
ALTER TABLE "Critere" ADD COLUMN     "orientation" TEXT NOT NULL DEFAULT 'HIGHER_BETTER',
ADD COLUMN     "scoring_mode" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- Reponse : scores officiels nullable (fini les 3 fantômes forcés)
ALTER TABLE "Reponse" ADD COLUMN     "critere_version" INTEGER,
ADD COLUMN     "score_normalise" DOUBLE PRECISION,
ADD COLUMN     "score_officiel" INTEGER,
ADD COLUMN     "score_source" TEXT,
ALTER COLUMN "score_brut" DROP NOT NULL;

-- Options métier (source de vérité du scoring)
CREATE TABLE "OptionCritere" (
    "id" TEXT NOT NULL,
    "id_critere" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "libelle_normalise" TEXT NOT NULL,
    "ordre_affichage" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "est_scorable" BOOLEAN NOT NULL DEFAULT true,
    "score" INTEGER,
    "poids" INTEGER,
    "valeur_metier" TEXT,
    "code_metier" TEXT,

    CONSTRAINT "OptionCritere_pkey" PRIMARY KEY ("id")
);

-- Jonction réponse <-> options (QCM = 1 ligne, CASES = N lignes)
CREATE TABLE "ReponseOption" (
    "id_reponse" BIGINT NOT NULL,
    "id_option" TEXT NOT NULL,

    CONSTRAINT "ReponseOption_pkey" PRIMARY KEY ("id_reponse","id_option")
);

CREATE INDEX "OptionCritere_id_critere_ordre_affichage_idx" ON "OptionCritere"("id_critere", "ordre_affichage");
CREATE UNIQUE INDEX "OptionCritere_id_critere_libelle_normalise_key" ON "OptionCritere"("id_critere", "libelle_normalise");
CREATE INDEX "ReponseOption_id_option_idx" ON "ReponseOption"("id_option");

ALTER TABLE "OptionCritere" ADD CONSTRAINT "OptionCritere_id_critere_fkey" FOREIGN KEY ("id_critere") REFERENCES "Critere"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReponseOption" ADD CONSTRAINT "ReponseOption_id_reponse_fkey" FOREIGN KEY ("id_reponse") REFERENCES "Reponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReponseOption" ADD CONSTRAINT "ReponseOption_id_option_fkey" FOREIGN KEY ("id_option") REFERENCES "OptionCritere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
