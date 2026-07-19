-- AlterTable
-- Ajoute le flag "obligatoire" (question facultative possible côté collecte).
-- Les types ECHELLE et CASES réutilisent le champ texte existant
-- "type_reponse" (pas de contrainte CHECK en base) : aucune migration de
-- schéma n'est nécessaire pour eux, seule la validation applicative change.
ALTER TABLE "Critere" ADD COLUMN     "obligatoire" BOOLEAN NOT NULL DEFAULT true;
