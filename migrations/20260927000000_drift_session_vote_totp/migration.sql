-- Drift C5/C2/C6a (J+30) : aligne la base sur schema.prisma SANS toucher aux
-- tables d'auth Wasp (Auth/AuthIdentity), gérées hors migrations Prisma
-- (injectées au build). Généré depuis `prisma migrate diff`, expurgé des
-- DROP TABLE Auth/AuthIdentity et des DROP d'index Session existants.
-- Base vide au moment de l'application (aucune donnée à migrer).

-- 2FA lockout (User)
ALTER TABLE "User" ADD COLUMN     "totp_failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totp_last_used_step" BIGINT,
ADD COLUMN     "totp_locked_until" TIMESTAMP(3);

-- Sessions révocables (Session) — table vide, colonnes sûres
ALTER TABLE "Session" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "tokenHash" TEXT NOT NULL,
ADD COLUMN     "userAgent" TEXT;

-- Anti-rejeu scopé entreprise (VoteAntiRejeu) — table vide
ALTER TABLE "VoteAntiRejeu" ADD COLUMN     "id_entreprise" INTEGER NOT NULL;
DROP INDEX "VoteAntiRejeu_hachage_tel_key";

-- Nouveaux index
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "VoteAntiRejeu_id_entreprise_hachage_tel_date_vote_key" ON "VoteAntiRejeu"("id_entreprise", "hachage_tel", "date_vote");

-- Contraintes
ALTER TABLE "VoteAntiRejeu" ADD CONSTRAINT "VoteAntiRejeu_id_entreprise_fkey" FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Session_userId_fkey existe déjà (identique) : pas de re-création.
