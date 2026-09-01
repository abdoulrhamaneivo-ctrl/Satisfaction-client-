-- CreateTable
CREATE TABLE "AnalyseAvisIA" (
    "id" BIGSERIAL NOT NULL,
    "reponseId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentiment" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "themes" TEXT,
    "problemePrincipal" TEXT,
    "urgence" TEXT,
    "resume" TEXT,
    "actionRecommandee" TEXT,
    "model" TEXT NOT NULL DEFAULT 'qwen/qwen3-next-80b-a3b-instruct',
    "provider" TEXT NOT NULL DEFAULT 'nvidia',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AnalyseAvisIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyseAvisIA_reponseId_key" ON "AnalyseAvisIA"("reponseId");

-- CreateIndex
CREATE INDEX "AnalyseAvisIA_status_idx" ON "AnalyseAvisIA"("status");

-- AddForeignKey
ALTER TABLE "AnalyseAvisIA" ADD CONSTRAINT "AnalyseAvisIA_reponseId_fkey" FOREIGN KEY ("reponseId") REFERENCES "Reponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
