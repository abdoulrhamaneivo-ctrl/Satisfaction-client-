-- CreateTable
CREATE TABLE "PlanPricing" (
    "id" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPricing_pkey" PRIMARY KEY ("id")
);

-- Valeurs par défaut (modifiables ensuite depuis /admin/tarifs)
INSERT INTO "PlanPricing" ("id", "amountFcfa", "updatedAt") VALUES
    ('hobby', 15000, CURRENT_TIMESTAMP),
    ('pro', 35000, CURRENT_TIMESTAMP),
    ('credits10', 5000, CURRENT_TIMESTAMP);
