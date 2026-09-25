-- Vague 1 Phase G : analyse globale d'expérience (synthèses IA périodiques
-- adossées à des snapshots déterministes). Table d'historique : les
-- reruns sont idempotents via l'unique (entreprise, periode, debut).
CREATE TABLE "GlobalExperienceAnalysis" (
    "id" BIGSERIAL NOT NULL,
    "id_entreprise" INTEGER NOT NULL,
    "periode" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "filtres" TEXT,
    "datasetSnapshot" TEXT,
    "indicateurs" TEXT,
    "resumeExecutif" TEXT,
    "pointsPositifs" TEXT,
    "pointsNegatifs" TEXT,
    "irritants" TEXT,
    "tendances" TEXT,
    "anomalies" TEXT,
    "priorites" TEXT,
    "confiance" TEXT,
    "limites" TEXT,
    "volumeAvis" INTEGER NOT NULL DEFAULT 0,
    "volumeCommentaires" INTEGER NOT NULL DEFAULT 0,
    "qualiteDonnees" DOUBLE PRECISION,
    "model" TEXT,
    "provider" TEXT,
    "promptVersion" TEXT,
    "analysisVersion" TEXT NOT NULL DEFAULT '1',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "GlobalExperienceAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GlobalExperienceAnalysis_id_entreprise_periode_debut_key" ON "GlobalExperienceAnalysis"("id_entreprise", "periode", "debut");
CREATE INDEX "GlobalExperienceAnalysis_id_entreprise_periode_fin_idx" ON "GlobalExperienceAnalysis"("id_entreprise", "periode", "fin");

ALTER TABLE "GlobalExperienceAnalysis" ADD CONSTRAINT "GlobalExperienceAnalysis_id_entreprise_fkey" FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
