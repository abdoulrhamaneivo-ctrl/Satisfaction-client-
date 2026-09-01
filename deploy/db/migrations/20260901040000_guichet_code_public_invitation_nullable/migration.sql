-- Guichet.code_public (QR opaque) + Invitation.id_entreprise nullable
-- Backfill obligatoire : la colonne est NOT NULL et la table contient déjà
-- des guichets. Chaque guichet existant reçoit un code opaque unique généré
-- en SQL (random + base36, re-tiré en cas de collision par la boucle UPDATE).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "Guichet" ADD COLUMN "code_public" TEXT;

-- Backfill : code = 10 caractères base62 lisibles (pas de 0/O/1/l pour
-- éviter les erreurs de lecture d'un QR imprimé)
WITH genere AS (
  SELECT id,
    array_to_string(ARRAY(
      SELECT substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1)
      FROM generate_series(1, 10)
    ), '') AS code
  FROM "Guichet"
  WHERE "code_public" IS NULL
)
UPDATE "Guichet" g SET "code_public" = gen.code
FROM genere gen WHERE g.id = gen.id;

ALTER TABLE "Guichet" ALTER COLUMN "code_public" SET NOT NULL;
CREATE UNIQUE INDEX "Guichet_code_public_key" ON "Guichet"("code_public");

-- Invitation : id_entreprise nullable (invitation plateforme = NULL)
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_id_entreprise_fkey";
ALTER TABLE "Invitation" ALTER COLUMN "id_entreprise" DROP NOT NULL;
-- Purge de la sentinelle historique 0 (aucune vraie entreprise id 0)
UPDATE "Invitation" SET "id_entreprise" = NULL WHERE "id_entreprise" = 0;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_id_entreprise_fkey" FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
