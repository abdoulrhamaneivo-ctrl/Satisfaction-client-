-- FIX build P1012 : le modèle applicatif `Session` collisionnait avec le modèle
-- `Session` injecté par Wasp (auth) — renommé `UserSession` dans schema.prisma.
-- 1) Restaure la table "Session" à sa forme Wasp (supprime les colonnes/index
--    ajoutés par erreur par 20260927000000).
-- 2) Crée la table dédiée "UserSession" (sessions révocables applicatives).

DROP INDEX IF EXISTS "Session_tokenHash_key";
DROP INDEX IF EXISTS "Session_userId_revokedAt_idx";
DROP INDEX IF EXISTS "Session_expiresAt_idx";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "tokenHash";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "ip";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "userAgent";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "revokedAt";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "createdAt";

CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
