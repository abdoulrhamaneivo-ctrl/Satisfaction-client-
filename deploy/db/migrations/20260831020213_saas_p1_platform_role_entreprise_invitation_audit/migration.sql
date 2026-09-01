-- AlterTable
ALTER TABLE "Entreprise" ADD COLUMN     "date_debut_abonnement" TIMESTAMP(3),
ADD COLUMN     "date_fin_abonnement" TIMESTAMP(3),
ADD COLUMN     "email_administratif" TEXT,
ADD COLUMN     "limite_agences" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "limite_guichets" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "limite_utilisateurs" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "motif_suspension" TEXT,
ADD COLUMN     "nom_court" TEXT,
ADD COLUMN     "pays" TEXT DEFAULT 'Cote d''Ivoire',
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'STARTER',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendue_le" TIMESTAMP(3),
ADD COLUMN     "telephone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platformRole" TEXT NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "Invitation" (
    "id" BIGSERIAL NOT NULL,
    "id_user" TEXT NOT NULL,
    "id_emetteur" TEXT NOT NULL,
    "id_entreprise" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "entreprise_id" INTEGER,
    "details" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entrepriseId" INTEGER,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandingConfig" (
    "id" BIGSERIAL NOT NULL,
    "id_entreprise" INTEGER NOT NULL,
    "logo_url" TEXT,
    "logo_light_url" TEXT,
    "favicon_url" TEXT,
    "nom_affiche" TEXT,
    "color_primary" TEXT,
    "color_secondary" TEXT,
    "color_accent" TEXT,
    "color_background" TEXT,
    "form_title" VARCHAR(120),
    "form_subtitle" VARCHAR(200),
    "form_thank_you" VARCHAR(120),
    "qr_slogan" VARCHAR(80),
    "qr_style" TEXT NOT NULL DEFAULT 'CLASSIQUE',
    "qr_color" TEXT,
    "qr_bg_color" TEXT,
    "qr_frame" TEXT NOT NULL DEFAULT 'SIMPLE',
    "hide_yeba_branding" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_hash_key" ON "Invitation"("token_hash");

-- CreateIndex
CREATE INDEX "Invitation_id_user_idx" ON "Invitation"("id_user");

-- CreateIndex
CREATE INDEX "Invitation_expires_at_idx" ON "Invitation"("expires_at");

-- CreateIndex
CREATE INDEX "Invitation_id_entreprise_created_at_idx" ON "Invitation"("id_entreprise", "created_at");

-- CreateIndex
CREATE INDEX "AuditLog_entreprise_id_created_at_idx" ON "AuditLog"("entreprise_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditLog_actor_id_created_at_idx" ON "AuditLog"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditLog_action_created_at_idx" ON "AuditLog"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "BrandingConfig_id_entreprise_key" ON "BrandingConfig"("id_entreprise");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_id_emetteur_fkey" FOREIGN KEY ("id_emetteur") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_id_entreprise_fkey" FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandingConfig" ADD CONSTRAINT "BrandingConfig_id_entreprise_fkey" FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
