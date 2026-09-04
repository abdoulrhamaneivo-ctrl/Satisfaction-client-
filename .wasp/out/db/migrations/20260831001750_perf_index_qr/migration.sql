-- CreateIndex
CREATE INDEX "AffectationGuichet_id_guichet_date_affectation_idx" ON "AffectationGuichet"("id_guichet", "date_affectation");

-- CreateIndex
CREATE INDEX "Reponse_id_agence_date_reponse_idx" ON "Reponse"("id_agence", "date_reponse");

-- CreateIndex
CREATE INDEX "Reponse_id_guichet_date_reponse_idx" ON "Reponse"("id_guichet", "date_reponse");

-- CreateIndex
CREATE INDEX "Reponse_id_soumission_idx" ON "Reponse"("id_soumission");
