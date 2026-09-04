-- Nettoyage audit ZAP #18 : résidu de renommage camelCase → snake_case.
-- La colonne entrepriseId (ancienne) coexistait avec entreprise_id (actuelle,
-- utilisée par le schema). Suppression de la colonne morte.
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "entrepriseId";
