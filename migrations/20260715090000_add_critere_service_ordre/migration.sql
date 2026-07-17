-- CreateTable
CREATE TABLE "CritereService" (
    "id" SERIAL NOT NULL,
    "id_critere" INTEGER NOT NULL,
    "id_service" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CritereService_pkey" PRIMARY KEY ("id")
);

-- Migration des données existantes depuis l'ancienne table many-to-many
-- implicite "_CritereToService" ("A" = id_critere, "B" = id_service).
-- L'ordre initial reprend l'ordre d'insertion d'origine (id du critère)
-- au sein de chaque opération, pour ne rien changer visuellement tant que
-- personne n'a encore réordonné manuellement.
INSERT INTO "CritereService" ("id_critere", "id_service", "ordre")
SELECT
  "A" AS "id_critere",
  "B" AS "id_service",
  (ROW_NUMBER() OVER (PARTITION BY "B" ORDER BY "A") - 1)::INTEGER AS "ordre"
FROM "_CritereToService";

-- CreateIndex
CREATE UNIQUE INDEX "CritereService_id_critere_id_service_key" ON "CritereService"("id_critere", "id_service");

-- CreateIndex
CREATE INDEX "CritereService_id_service_ordre_idx" ON "CritereService"("id_service", "ordre");

-- AddForeignKey
ALTER TABLE "CritereService" ADD CONSTRAINT "CritereService_id_critere_fkey" FOREIGN KEY ("id_critere") REFERENCES "Critere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CritereService" ADD CONSTRAINT "CritereService_id_service_fkey" FOREIGN KEY ("id_service") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable (ancienne relation implicite, remplacée par CritereService)
DROP TABLE "_CritereToService";
