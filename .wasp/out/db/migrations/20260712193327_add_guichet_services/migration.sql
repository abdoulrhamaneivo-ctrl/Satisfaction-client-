-- DropForeignKey
ALTER TABLE "Reponse" DROP CONSTRAINT "Reponse_id_service_fkey";

-- AlterTable
ALTER TABLE "Reponse" ADD COLUMN     "id_soumission" TEXT,
ALTER COLUMN "id_service" DROP NOT NULL;

-- CreateTable
CREATE TABLE "_GuichetToService" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CritereToService" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_GuichetToService_AB_unique" ON "_GuichetToService"("A", "B");

-- CreateIndex
CREATE INDEX "_GuichetToService_B_index" ON "_GuichetToService"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CritereToService_AB_unique" ON "_CritereToService"("A", "B");

-- CreateIndex
CREATE INDEX "_CritereToService_B_index" ON "_CritereToService"("B");

-- AddForeignKey
ALTER TABLE "Reponse" ADD CONSTRAINT "Reponse_id_service_fkey" FOREIGN KEY ("id_service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GuichetToService" ADD CONSTRAINT "_GuichetToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Guichet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GuichetToService" ADD CONSTRAINT "_GuichetToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CritereToService" ADD CONSTRAINT "_CritereToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Critere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CritereToService" ADD CONSTRAINT "_CritereToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
