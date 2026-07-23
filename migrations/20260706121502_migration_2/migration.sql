-- CreateTable
CREATE TABLE "AgenceCritere" (
    "id_agence" INTEGER NOT NULL,
    "id_critere" INTEGER NOT NULL,

    CONSTRAINT "AgenceCritere_pkey" PRIMARY KEY ("id_agence","id_critere")
);

-- AddForeignKey
ALTER TABLE "AgenceCritere" ADD CONSTRAINT "AgenceCritere_id_agence_fkey" FOREIGN KEY ("id_agence") REFERENCES "Agence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgenceCritere" ADD CONSTRAINT "AgenceCritere_id_critere_fkey" FOREIGN KEY ("id_critere") REFERENCES "Critere"("id") ON DELETE CASCADE ON UPDATE CASCADE;
