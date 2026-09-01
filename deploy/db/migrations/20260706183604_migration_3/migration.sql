-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "alerteId" BIGINT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_alerteId_fkey" FOREIGN KEY ("alerteId") REFERENCES "Alerte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
