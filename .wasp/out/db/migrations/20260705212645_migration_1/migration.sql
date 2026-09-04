-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "paymentProcessorUserId" TEXT,
    "lemonSqueezyCustomerPortalUrl" TEXT,
    "subscriptionPlan" TEXT,
    "subscriptionStatus" TEXT,
    "sendEmail" BOOLEAN NOT NULL DEFAULT false,
    "datePaid" TIMESTAMP(3),
    "credits" INTEGER NOT NULL DEFAULT 3,
    "nom" TEXT DEFAULT '',
    "prenom" TEXT DEFAULT '',
    "telephone" TEXT DEFAULT '',
    "role" TEXT DEFAULT 'AGENT',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "id_agence" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entreprise" (
    "id" SERIAL NOT NULL,
    "nom_entreprise" TEXT NOT NULL,
    "date_creation_compte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agence" (
    "id" SERIAL NOT NULL,
    "nom_agence" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "adresse" TEXT,
    "heure_ouverture" TEXT NOT NULL DEFAULT '08:00',
    "heure_fermeture" TEXT NOT NULL DEFAULT '17:00',
    "jours_ouvres" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
    "id_entreprise" INTEGER NOT NULL,

    CONSTRAINT "Agence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guichet" (
    "id" SERIAL NOT NULL,
    "nom_guichet" TEXT NOT NULL,
    "type_guichet" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "id_agence" INTEGER NOT NULL,

    CONSTRAINT "Guichet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectationGuichet" (
    "id" SERIAL NOT NULL,
    "date_affectation" DATE NOT NULL,
    "heure_debut" TEXT NOT NULL,
    "heure_fin" TEXT NOT NULL,
    "id_guichet" INTEGER NOT NULL,
    "id_agent" TEXT NOT NULL,

    CONSTRAINT "AffectationGuichet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "libelle_service" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Critere" (
    "id" SERIAL NOT NULL,
    "libelle_critere" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Critere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objectif" (
    "id" SERIAL NOT NULL,
    "valeur_cible" DECIMAL(5,2) NOT NULL,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE NOT NULL,
    "id_critere" INTEGER NOT NULL,
    "id_agence" INTEGER NOT NULL,

    CONSTRAINT "Objectif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Canal" (
    "id" SERIAL NOT NULL,
    "type_canal" TEXT NOT NULL,
    "langue_utilisee" TEXT NOT NULL,

    CONSTRAINT "Canal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reponse" (
    "id" BIGSERIAL NOT NULL,
    "date_reponse" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score_brut" INTEGER NOT NULL,
    "audio_url" TEXT,
    "commentaire_texte" TEXT,
    "id_critere" INTEGER NOT NULL,
    "id_canal" INTEGER NOT NULL,
    "id_agence" INTEGER NOT NULL,
    "id_guichet" INTEGER NOT NULL,
    "id_service" INTEGER NOT NULL,
    "id_agent" TEXT,

    CONSTRAINT "Reponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerte" (
    "id" BIGSERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "statut_alerte" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "type_alerte" TEXT NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_traitement" TIMESTAMP(3),
    "id_reponse" BIGINT,
    "id_destinataire" TEXT NOT NULL,
    "id_guichet_concerne" INTEGER,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacheCorrective" (
    "id" BIGSERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "statut_tache" TEXT NOT NULL DEFAULT 'A_FAIRE',
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_echeance" TIMESTAMP(3) NOT NULL,
    "date_cloture" TIMESTAMP(3),
    "id_alerte" BIGINT NOT NULL,
    "id_responsable" TEXT NOT NULL,

    CONSTRAINT "TacheCorrective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatistiquesMensuelles" (
    "id" BIGSERIAL NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "nombre_reponses" INTEGER NOT NULL DEFAULT 0,
    "score_moyen" DECIMAL(5,2) NOT NULL,
    "niveau_conformite" TEXT NOT NULL DEFAULT 'Informelle',
    "id_agence" INTEGER NOT NULL,
    "id_guichet" INTEGER,
    "id_service" INTEGER,
    "id_critere" INTEGER NOT NULL,

    CONSTRAINT "StatistiquesMensuelles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GptResponse" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "GptResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "time" TEXT NOT NULL DEFAULT '1',

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactFormMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContactFormMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStats" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "prevDayViewsChangePercent" TEXT NOT NULL DEFAULT '0',
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "paidUserCount" INTEGER NOT NULL DEFAULT 0,
    "userDelta" INTEGER NOT NULL DEFAULT 0,
    "paidUserDelta" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageViewSource" (
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitors" INTEGER NOT NULL,
    "dailyStatsId" INTEGER,

    CONSTRAINT "PageViewSource_pkey" PRIMARY KEY ("date","name")
);

-- CreateTable
CREATE TABLE "Logs" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "dailyStatsId" INTEGER,

    CONSTRAINT "Logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "providerName" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "providerData" TEXT NOT NULL DEFAULT '{}',
    "authId" TEXT NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("providerName","providerUserId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_paymentProcessorUserId_key" ON "User"("paymentProcessorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStats_date_key" ON "DailyStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_userId_key" ON "Auth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_id_key" ON "Session"("id");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_id_agence_fkey" FOREIGN KEY ("id_agence") REFERENCES "Agence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agence" ADD CONSTRAINT "Agence_id_entreprise_fkey" FOREIGN KEY ("id_entreprise") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guichet" ADD CONSTRAINT "Guichet_id_agence_fkey" FOREIGN KEY ("id_agence") REFERENCES "Agence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationGuichet" ADD CONSTRAINT "AffectationGuichet_id_guichet_fkey" FOREIGN KEY ("id_guichet") REFERENCES "Guichet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationGuichet" ADD CONSTRAINT "AffectationGuichet_id_agent_fkey" FOREIGN KEY ("id_agent") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objectif" ADD CONSTRAINT "Objectif_id_critere_fkey" FOREIGN KEY ("id_critere") REFERENCES "Critere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objectif" ADD CONSTRAINT "Objectif_id_agence_fkey" FOREIGN KEY ("id_agence") REFERENCES "Agence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reponse" ADD CONSTRAINT "Reponse_id_critere_fkey" FOREIGN KEY ("id_critere") REFERENCES "Critere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reponse" ADD CONSTRAINT "Reponse_id_canal_fkey" FOREIGN KEY ("id_canal") REFERENCES "Canal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reponse" ADD CONSTRAINT "Reponse_id_agence_fkey" FOREIGN KEY ("id_agence") REFERENCES "Agence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reponse" ADD CONSTRAINT "Reponse_id_guichet_fkey" FOREIGN KEY ("id_guichet") REFERENCES "Guichet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reponse" ADD CONSTRAINT "Reponse_id_service_fkey" FOREIGN KEY ("id_service") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reponse" ADD CONSTRAINT "Reponse_id_agent_fkey" FOREIGN KEY ("id_agent") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_id_reponse_fkey" FOREIGN KEY ("id_reponse") REFERENCES "Reponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_id_destinataire_fkey" FOREIGN KEY ("id_destinataire") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_id_guichet_concerne_fkey" FOREIGN KEY ("id_guichet_concerne") REFERENCES "Guichet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheCorrective" ADD CONSTRAINT "TacheCorrective_id_alerte_fkey" FOREIGN KEY ("id_alerte") REFERENCES "Alerte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheCorrective" ADD CONSTRAINT "TacheCorrective_id_responsable_fkey" FOREIGN KEY ("id_responsable") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatistiquesMensuelles" ADD CONSTRAINT "StatistiquesMensuelles_id_agence_fkey" FOREIGN KEY ("id_agence") REFERENCES "Agence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatistiquesMensuelles" ADD CONSTRAINT "StatistiquesMensuelles_id_guichet_fkey" FOREIGN KEY ("id_guichet") REFERENCES "Guichet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatistiquesMensuelles" ADD CONSTRAINT "StatistiquesMensuelles_id_service_fkey" FOREIGN KEY ("id_service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatistiquesMensuelles" ADD CONSTRAINT "StatistiquesMensuelles_id_critere_fkey" FOREIGN KEY ("id_critere") REFERENCES "Critere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GptResponse" ADD CONSTRAINT "GptResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactFormMessage" ADD CONSTRAINT "ContactFormMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageViewSource" ADD CONSTRAINT "PageViewSource_dailyStatsId_fkey" FOREIGN KEY ("dailyStatsId") REFERENCES "DailyStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_dailyStatsId_fkey" FOREIGN KEY ("dailyStatsId") REFERENCES "DailyStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auth" ADD CONSTRAINT "Auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_authId_fkey" FOREIGN KEY ("authId") REFERENCES "Auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
