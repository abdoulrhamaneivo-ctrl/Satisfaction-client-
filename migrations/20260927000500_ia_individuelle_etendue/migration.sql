-- Vague 1 Phase F : analyse individuelle enrichie (§23) + traçabilité
-- modèle (§47-48). Colonnes NULLables : aucune donnée à migrer (les lignes
-- existantes gardent leurs valeurs ; les nouveaux champs sont remplis par
-- le job, avec replis documentés si le modèle ne les renvoie pas).
ALTER TABLE "AnalyseAvisIA" ADD COLUMN     "sousThemes" TEXT,
ADD COLUMN     "problemesSecondaires" TEXT,
ADD COLUMN     "severite" TEXT,
ADD COLUMN     "emotion" TEXT,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "analysisVersion" TEXT DEFAULT '1';
