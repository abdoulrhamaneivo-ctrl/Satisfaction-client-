import type { PrismaClient } from "@prisma/client";
import {
  createProviderId,
  createUser,
  sanitizeAndSerializeProviderData,
} from 'wasp/server/auth';

// Constantes de configuration pour le seed mono-agence
const NOM_ENTREPRISE = "Mon Entreprise";
const NOM_AGENCE = "Agence Centrale";
const COMMUNE_AGENCE = "Plateau";
const EMAIL_CHEF = "chef@cxsat.local";
const MOT_DE_PASSE_CHEF = "chefpassword123";

/**
 * Seeding unique pour l'outil interne mono-agence de CXSAT.
 * Crée l'Entreprise, l'Agence et le compte CHEF_AGENCE par défaut.
 *
 * Pour créer manuellement un compte admin de maintenance technique :
 * 1. Créez un compte via inviteAgent (ou insérez dans la base)
 * 2. Mettez à jour le champ `isAdmin` de l'utilisateur à `true` :
 *    UPDATE "User" SET "isAdmin" = true WHERE "email" = 'admin@cxsat.local';
 */
export async function seedMockUsers(prismaClient: PrismaClient) {
  console.log("Début du seeding mono-agence...");

  // 1. Création de l'Entreprise unique
  let entreprise = await prismaClient.entreprise.findFirst({
    where: { nom_entreprise: NOM_ENTREPRISE }
  });

  if (!entreprise) {
    console.log(`Création de l'entreprise : ${NOM_ENTREPRISE}...`);
    entreprise = await prismaClient.entreprise.create({
      data: {
        nom_entreprise: NOM_ENTREPRISE
      }
    });
  } else {
    console.log(`L'entreprise "${NOM_ENTREPRISE}" existe déjà (ID: ${entreprise.id}).`);
  }

  // Garde-fou supplémentaire : on s'assure qu'on n'a pas plusieurs entreprises
  const totalEntreprises = await prismaClient.entreprise.count();
  if (totalEntreprises > 1) {
    console.warn("ATTENTION : Plusieurs entreprises détectées en base de données.");
  }

  // 2. Création de l'Agence unique
  let agence = await prismaClient.agence.findFirst({
    where: { nom_agence: NOM_AGENCE, id_entreprise: entreprise.id }
  });

  if (!agence) {
    console.log(`Création de l'agence : ${NOM_AGENCE}...`);
    agence = await prismaClient.agence.create({
      data: {
        nom_agence: NOM_AGENCE,
        commune: COMMUNE_AGENCE,
        jours_ouvres: "1,2,3,4,5,6",
        id_entreprise: entreprise.id
      }
    });
  } else {
    console.log(`L'agence "${NOM_AGENCE}" existe déjà (ID: ${agence.id}).`);
  }

  // 3. Création des critères d'évaluation de base (Norme FD X50-167)
  console.log("Création des critères d'évaluation...");
  await prismaClient.critere.createMany({
    data: [
      { id: 1, libelle_critere: "Temps d'attente", description: "Temps mis avant d'être servi au guichet", id_entreprise: entreprise.id },
      { id: 2, libelle_critere: "Accueil guichetier", description: "Politesse et amabilité de l'agent", id_entreprise: entreprise.id },
      { id: 3, libelle_critere: "Clarté des informations", description: "Clarté des explications fournies", id_entreprise: entreprise.id }
    ],
    skipDuplicates: true,
  });

  // 4. Création des types de services de base
  console.log("Création des types de services...");
  await prismaClient.service.createMany({
    data: [
      { id: 1, libelle_service: "Retrait d'argent / Mobile Money", id_entreprise: entreprise.id },
      { id: 2, libelle_service: "Envoi ou réception de colis", id_entreprise: entreprise.id },
      { id: 3, libelle_service: "Opération Épargne / Dépôt", id_entreprise: entreprise.id }
    ],
    skipDuplicates: true,
  });

  // Associer par défaut les critères aux services dans CritereService si pas déjà fait
  console.log("Liaison par défaut des critères aux services...");
  for (const sId of [1, 2, 3]) {
    for (const cId of [1, 2, 3]) {
      await prismaClient.critereService.upsert({
        where: { id_critere_id_service: { id_critere: cId, id_service: sId } },
        update: {},
        create: {
          id_critere: cId,
          id_service: sId,
          ordre: cId
        }
      });
    }
  }

  // Activer aussi tous les critères pour cette agence unique
  console.log("Activation des critères pour l'agence unique...");
  for (const cId of [1, 2, 3]) {
    await prismaClient.agenceCritere.upsert({
      where: { id_agence_id_critere: { id_agence: agence.id, id_critere: cId } },
      update: {},
      create: {
        id_agence: agence.id,
        id_critere: cId
      }
    });
  }

  // 5. Création des canaux de communication inclusifs
  console.log("Création des canaux de communication...");
  await prismaClient.canal.createMany({
    data: [
      { id: 1, type_canal: "QR_WEB", langue_utilisee: "Français" },
      { id: 2, type_canal: "USSD", langue_utilisee: "Dioula" },
      { id: 3, type_canal: "IVR_VOCAL", langue_utilisee: "Baoulé" }
    ],
    skipDuplicates: true,
  });

  // 6. Création du compte CHEF_AGENCE unique
  const userExistant = await prismaClient.user.findFirst({
    where: { email: EMAIL_CHEF }
  });

  if (!userExistant) {
    console.log(`Création du compte CHEF_AGENCE : ${EMAIL_CHEF}...`);
    const providerId = createProviderId('email', EMAIL_CHEF);
    const providerData = await sanitizeAndSerializeProviderData<'email'>({
      hashedPassword: MOT_DE_PASSE_CHEF,
      isEmailVerified: true,
      emailVerificationSentAt: null,
      passwordResetSentAt: null,
    });

    const chefUser = await createUser(providerId, providerData, {
      email: EMAIL_CHEF,
      nom: "Responsable",
      prenom: "Agence",
      role: "CHEF_AGENCE",
      id_agence: agence.id,
      id_entreprise: entreprise.id,
      telephone: "0102030405",
      actif: true,
      isAdmin: false,
    });

    console.log(`Compte CHEF_AGENCE créé avec succès.`);
    console.log(`Identifiants par défaut :`);
    console.log(`  E-mail   : ${EMAIL_CHEF}`);
    console.log(`  Password : ${MOT_DE_PASSE_CHEF}`);
  } else {
    console.log(`Le compte CHEF_AGENCE (${EMAIL_CHEF}) existe déjà.`);
  }

  console.log("Seeding mono-agence terminé avec succès !");
}