-- CreateTable
CREATE TABLE "BrandConfig" (
    "id" SERIAL NOT NULL,
    "id_entreprise" INTEGER NOT NULL,
    "platform_name" TEXT NOT NULL DEFAULT 'CXSAT',
    "platform_description" TEXT NOT NULL DEFAULT 'Plateforme de pilotage de la satisfaction client',
    "logo_url" TEXT,
    "logo_dark_url" TEXT,
    "favicon_url" TEXT,
    "color_background" TEXT NOT NULL DEFAULT '40 20% 98.5%',
    "color_foreground" TEXT NOT NULL DEFAULT '0 0% 3.9%',
    "color_card" TEXT NOT NULL DEFAULT '40 20% 99%',
    "color_card_foreground" TEXT NOT NULL DEFAULT '0 0% 3.9%',
    "color_popover" TEXT NOT NULL DEFAULT '0 0% 100%',
    "color_popover_foreground" TEXT NOT NULL DEFAULT '0 0% 3.9%',
    "color_primary" TEXT NOT NULL DEFAULT '210 100% 13%',
    "color_primary_foreground" TEXT NOT NULL DEFAULT '0 0% 98%',
    "color_secondary" TEXT NOT NULL DEFAULT '32 100% 37%',
    "color_secondary_foreground" TEXT NOT NULL DEFAULT '0 0% 9%',
    "color_accent" TEXT NOT NULL DEFAULT '33 74% 62%',
    "color_accent_foreground" TEXT NOT NULL DEFAULT '0 0% 98%',
    "color_muted" TEXT NOT NULL DEFAULT '0 0% 96.1%',
    "color_muted_foreground" TEXT NOT NULL DEFAULT '0 0% 38%',
    "color_destructive" TEXT NOT NULL DEFAULT '0 84.2% 60.2%',
    "color_destructive_foreground" TEXT NOT NULL DEFAULT '0 0% 98%',
    "color_success" TEXT NOT NULL DEFAULT '141 71% 48%',
    "color_success_foreground" TEXT NOT NULL DEFAULT '0 0% 98%',
    "color_warning" TEXT NOT NULL DEFAULT '36 100% 50%',
    "color_warning_foreground" TEXT NOT NULL DEFAULT '0 0% 98%',
    "color_border" TEXT NOT NULL DEFAULT '0 0% 89.8%',
    "color_input" TEXT NOT NULL DEFAULT '0 0% 89.8%',
    "color_ring" TEXT NOT NULL DEFAULT '0 0% 3.9%',
    "border_radius" TEXT NOT NULL DEFAULT '0.5rem',
    "shadow_style" TEXT NOT NULL DEFAULT 'DEFAULT',
    "font_family" TEXT NOT NULL DEFAULT 'Satoshi',
    "font_url" TEXT,
    "form_title" TEXT NOT NULL DEFAULT 'Votre avis compte !',
    "form_subtitle" TEXT NOT NULL DEFAULT 'Notez-nous en 10 secondes apres votre passage',
    "form_thank_you" TEXT NOT NULL DEFAULT 'Merci pour votre avis !',
    "qr_slogan" TEXT NOT NULL DEFAULT 'Scannez ce QR Code',
    "ussd_help_text" TEXT NOT NULL DEFAULT 'Pas de connexion internet ?',
    "hide_cxsat_branding" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacheCorrectiveHistorique" (
    "id" BIGSERIAL NOT NULL,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ancien_statut" TEXT NOT NULL,
    "nouveau_statut" TEXT NOT NULL,
    "commentaire" TEXT,
    "id_tache" BIGINT NOT NULL,
    "id_auteur" TEXT NOT NULL,

    CONSTRAINT "TacheCorrectiveHistorique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandConfig_id_entreprise_key" ON "BrandConfig"("id_entreprise");

-- CreateIndex
CREATE INDEX "TacheCorrectiveHistorique_id_tache_date_action_idx" ON "TacheCorrectiveHistorique"("id_tache", "date_action");

-- AddForeignKey
ALTER TABLE "BrandConfig" ADD CONSTRAINT "BrandConfig_id_entreprise_fkey" FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheCorrectiveHistorique" ADD CONSTRAINT "TacheCorrectiveHistorique_id_tache_fkey" FOREIGN KEY ("id_tache") REFERENCES "TacheCorrective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheCorrectiveHistorique" ADD CONSTRAINT "TacheCorrectiveHistorique_id_auteur_fkey" FOREIGN KEY ("id_auteur") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
