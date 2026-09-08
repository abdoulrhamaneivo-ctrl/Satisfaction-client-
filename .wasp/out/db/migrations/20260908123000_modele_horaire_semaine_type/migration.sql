-- Semaine type : grille horaire hebdomadaire récurrente (évite de ressaisir
-- le planning chaque matin). Table isolée, aucun impact sur l'existant.
-- jour_semaine : 0 (dimanche) … 6 (samedi), convention JS déjà utilisée
-- par alerteSilence et jours_ouvres.

-- CreateTable
CREATE TABLE "ModeleHoraire" (
    "id" SERIAL NOT NULL,
    "id_agence" INTEGER NOT NULL,
    "jour_semaine" INTEGER NOT NULL,
    "heure_debut" TEXT NOT NULL,
    "heure_fin" TEXT NOT NULL,
    "id_guichet" INTEGER NOT NULL,
    "id_agent" TEXT NOT NULL,

    CONSTRAINT "ModeleHoraire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModeleHoraire_id_agence_jour_semaine_idx" ON "ModeleHoraire"("id_agence", "jour_semaine");

-- AddForeignKey
ALTER TABLE "ModeleHoraire" ADD CONSTRAINT "ModeleHoraire_id_agence_fkey" FOREIGN KEY ("id_agence") REFERENCES "Agence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeleHoraire" ADD CONSTRAINT "ModeleHoraire_id_guichet_fkey" FOREIGN KEY ("id_guichet") REFERENCES "Guichet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeleHoraire" ADD CONSTRAINT "ModeleHoraire_id_agent_fkey" FOREIGN KEY ("id_agent") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
