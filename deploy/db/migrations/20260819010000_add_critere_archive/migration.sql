-- AlterTable
ALTER TABLE "Critere" ADD COLUMN "archive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "date_archivage" TIMESTAMP(3);
