-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totp_actif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totp_secret" TEXT;
