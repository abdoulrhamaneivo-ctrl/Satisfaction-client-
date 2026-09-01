-- AlterTable
ALTER TABLE "AnalyseAvisIA" ADD COLUMN     "commentaireTexte" TEXT,
ALTER COLUMN "model" SET DEFAULT 'deepseek-chat',
ALTER COLUMN "provider" SET DEFAULT 'deepseek';
