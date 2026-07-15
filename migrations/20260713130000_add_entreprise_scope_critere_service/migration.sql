-- Isolation par entreprise du catalogue Critere/Service.
-- id_entreprise NULL = socle commun de la plateforme (ex. les critères/
-- services créés au seed initial, visibles par toutes les entreprises).
-- id_entreprise renseigné = ressource propre à une entreprise, invisible
-- aux autres (les critères créés via createCritere sont désormais rattachés
-- à l'entreprise de leur créateur).

ALTER TABLE "Critere" ADD COLUMN "id_entreprise" INTEGER;
ALTER TABLE "Critere"
  ADD CONSTRAINT "Critere_id_entreprise_fkey"
  FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Critere_id_entreprise_idx" ON "Critere"("id_entreprise");

ALTER TABLE "Service" ADD COLUMN "id_entreprise" INTEGER;
ALTER TABLE "Service"
  ADD CONSTRAINT "Service_id_entreprise_fkey"
  FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Service_id_entreprise_idx" ON "Service"("id_entreprise");

-- Les critères/services déjà en base (créés avant cette migration, via
-- l'ancien createCritere non scopé) restent avec id_entreprise = NULL,
-- donc deviennent visibles par TOUTES les entreprises (comportement
-- identique à avant, pas de régression). Si certains d'entre eux doivent en
-- réalité être propres à une seule entreprise, il faudra les rattacher
-- manuellement au cas par cas (impossible à déduire automatiquement : rien
-- ne rattachait ces lignes à une entreprise avant cette migration).
