-- Migration: Ajout de la table VoteAntiRejeu pour l'anti-rejeu des votes
-- par hachage SHA-256 du numéro de téléphone (conformité ARTCI)

CREATE TABLE "VoteAntiRejeu" (
    "id" BIGSERIAL NOT NULL,
    "hachage_tel" TEXT NOT NULL,
    "date_vote" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteAntiRejeu_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VoteAntiRejeu_hachage_tel_key" ON "VoteAntiRejeu"("hachage_tel");

CREATE INDEX "VoteAntiRejeu_date_vote_idx" ON "VoteAntiRejeu"("date_vote");
