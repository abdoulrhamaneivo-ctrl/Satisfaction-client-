-- Vague 1 Phase D : provenance des scores d'options (EXPLICIT | INFERRED |
-- MIGRATED, NULL = non scoré). Colonne NULLable : aucune donnée à migrer.
-- Les options existantes (backfill) sont marquées MIGRATED par le script
-- de consolidation ; les créations/éditions admin renseignent ensuite.
ALTER TABLE "OptionCritere" ADD COLUMN     "score_provenance" TEXT;
