-- Archivage logique (jamais de suppression physique) pour Agence, Guichet,
-- Alerte et TacheCorrective : deux colonnes par table, `archive` (défaut
-- false, donc rien n'est archivé rétroactivement par cette migration) et
-- `date_archivage` pour tracer quand.

-- AlterTable
ALTER TABLE "Agence" ADD COLUMN     "archive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "date_archivage" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Guichet" ADD COLUMN     "archive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "date_archivage" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Alerte" ADD COLUMN     "archive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "date_archivage" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TacheCorrective" ADD COLUMN     "archive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "date_archivage" TIMESTAMP(3);

-- Index de performance : les requêtes actives filtrent systématiquement sur
-- archive = false (Kanban, listes de guichets/agences), et les requêtes
-- d'archives filtrent sur archive = true — un index partiel accélère les
-- deux sens sans gonfler inutilement l'index sur les tables les plus
-- volumineuses (Alerte, TacheCorrective).
CREATE INDEX "Alerte_archive_idx" ON "Alerte"("archive");
CREATE INDEX "TacheCorrective_archive_idx" ON "TacheCorrective"("archive");
