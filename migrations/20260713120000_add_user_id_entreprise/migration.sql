-- Isolation multi-tenant : rattache chaque User à son Entreprise (tenant)
-- de façon dénormalisée, pour que DIRECTION/QUALITE puissent être scopés
-- à leur propre entreprise et non à la plateforme entière.

ALTER TABLE "User" ADD COLUMN "id_entreprise" INTEGER;

ALTER TABLE "User"
  ADD CONSTRAINT "User_id_entreprise_fkey"
  FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Rétro-remplissage : déduit l'entreprise de chaque utilisateur déjà rattaché
-- à une agence, à partir de Agence.id_entreprise.
UPDATE "User" u
SET "id_entreprise" = a."id_entreprise"
FROM "Agence" a
WHERE u."id_agence" = a."id"
  AND u."id_entreprise" IS NULL;

CREATE INDEX "User_id_entreprise_idx" ON "User"("id_entreprise");
