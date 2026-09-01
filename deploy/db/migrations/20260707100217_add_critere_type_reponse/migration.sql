-- AlterTable
ALTER TABLE "Critere" ADD COLUMN     "options_reponse" TEXT,
ADD COLUMN     "type_reponse" TEXT NOT NULL DEFAULT 'SMILEY';
