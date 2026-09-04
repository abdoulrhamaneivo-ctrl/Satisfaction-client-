-- Migration unique : conversion de CXSAT en outil interne mono-agence.
-- Regroupe les suppressions de champs/modèles issues des étapes :
--   1. Paiement (Stripe/LemonSqueezy/Polar) : colonnes User + table PlanPricing
--   5. Formulaire de contact (landing page supprimée) : table ContactFormMessage
--   6. Analytics marketing (Google Analytics) : tables DailyStats/PageViewSource
--      et la colonne Logs.dailyStatsId qui les référençait
--   7. Personnalisation de marque (BrandConfig) : table BrandConfig
--
-- ATTENTION : cette migration est DESTRUCTIVE (perte de données sur les
-- colonnes/tables listées ci-dessous). Si l'environnement cible contient des
-- données réelles, faire un `pg_dump` de sauvegarde AVANT de l'appliquer
-- (voir README.md / instructions de l'étape 10).

-- ============================================================================
-- 1. Paiement — colonnes User + table PlanPricing
-- ============================================================================

-- AlterTable
ALTER TABLE "User" DROP COLUMN "paymentProcessorUserId",
DROP COLUMN "lemonSqueezyCustomerPortalUrl",
DROP COLUMN "subscriptionPlan",
DROP COLUMN "subscriptionStatus",
DROP COLUMN "datePaid",
DROP COLUMN "credits";

-- DropTable
DROP TABLE "PlanPricing";

-- ============================================================================
-- 5. Formulaire de contact — table ContactFormMessage
-- ============================================================================

-- DropForeignKey
ALTER TABLE "ContactFormMessage" DROP CONSTRAINT "ContactFormMessage_userId_fkey";

-- DropTable
DROP TABLE "ContactFormMessage";

-- ============================================================================
-- 6. Analytics marketing — DailyStats / PageViewSource / Logs.dailyStatsId
-- ============================================================================

-- DropForeignKey
ALTER TABLE "PageViewSource" DROP CONSTRAINT "PageViewSource_dailyStatsId_fkey";

-- DropForeignKey
ALTER TABLE "Logs" DROP CONSTRAINT "Logs_dailyStatsId_fkey";

-- DropTable
DROP TABLE "PageViewSource";

-- DropTable
DROP TABLE "DailyStats";

-- AlterTable
ALTER TABLE "Logs" DROP COLUMN "dailyStatsId";

-- ============================================================================
-- 7. Personnalisation de marque — table BrandConfig
-- ============================================================================

-- DropForeignKey
ALTER TABLE "BrandConfig" DROP CONSTRAINT "BrandConfig_id_entreprise_fkey";

-- DropTable
DROP TABLE "BrandConfig";
