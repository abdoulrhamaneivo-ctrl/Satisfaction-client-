import type { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import {
  createProviderId,
  createUser,
  sanitizeAndSerializeProviderData,
} from 'wasp/server/auth';

// Constantes de configuration pour le seed mono-agence.
// `NOM_ENTREPRISE` n'est utilisé QUE lors de la toute première exécution
// (quand aucune Entreprise n'existe encore en base) : le modifier après coup
// ne renomme pas l'entreprise existante, voir la garde anti-doublon ci-dessous.
const NOM_ENTREPRISE = "Mon Entreprise";
const NOM_AGENCE = "Agence Centrale";
const COMMUNE_AGENCE = "Plateau";
const EMAIL_CHEF = "abdoulivo5@gmail.com";

/**
 * Seeding unique pour l'outil interne mono-agence de Yeba.
 * Crée l'Entreprise, l'Agence et le compte CHEF_AGENCE par défaut.
 * Idempotent : peut être relancé sans effet de bord (aucune donnée dupliquée).
 *
 * Pour créer manuellement un second compte réservé à la maintenance
 * technique (accès `isAdmin`, indépendant des rôles métier CHEF_AGENCE /
 * QUALITE / AGENT) :
 * 1. Invitez normalement ce compte via l'action `inviteAgent` (rôle
 *    QUALITE ou CHEF_AGENCE selon le besoin métier réel de la personne) —
 *    il n'y a pas d'inscription publique, seule l'invitation existe.
 * 2. Élevez ensuite ce compte au statut d'admin technique en base :
 *    UPDATE "User" SET "isAdmin" = true WHERE "email" = '...';
 * Ce compte n'est volontairement PAS créé automatiquement par ce seed,
 * pour éviter un compte admin par défaut avec un mot de passe prévisible.
 */
export async function seedEntrepriseUnique(prismaClient: PrismaClient) {
  console.log("Début du seeding mono-agence...");

  // 1. Création de l'Entreprise unique.
  // Garde anti-doublon stricte : si une Entreprise existe déjà (quel que
  // soit son nom), on la réutilise systématiquement au lieu d'en créer une
  // seconde — y compris si NOM_ENTREPRISE a été modifié entre-temps.
  const entrepriseCount = await prismaClient.entreprise.count();
  let entreprise;

  if (entrepriseCount === 0) {
    console.log(`Création de l'entreprise : ${NOM_ENTREPRISE}...`);
    entreprise = await prismaClient.entreprise.create({
      data: { nom_entreprise: NOM_ENTREPRISE },
    });
  } else {
    entreprise = await prismaClient.entreprise.findFirstOrThrow({
      orderBy: { id: "asc" },
    });
    console.log(`Entreprise existante réutilisée : "${entreprise.nom_entreprise}" (ID: ${entreprise.id}).`);
    if (entrepriseCount > 1) {
      console.warn(
        `ATTENTION : ${entrepriseCount} entreprises détectées en base de données ` +
        `(déploiement mono-agence attendu : une seule). Vérifiez qu'aucune ` +
        `création manuelle erronée n'a eu lieu.`
      );
    }
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

    // Mot de passe généré aléatoirement (jamais codé en dur / versionné) et
    // affiché une seule fois en console au moment du seed : à communiquer
    // à la personne concernée puis à changer dès la première connexion.
    const motDePasseInitial = crypto.randomBytes(9).toString('base64url');

    const providerId = createProviderId('email', EMAIL_CHEF);
    const providerData = await sanitizeAndSerializeProviderData<'email'>({
      hashedPassword: motDePasseInitial,
      isEmailVerified: true,
      emailVerificationSentAt: null,
      passwordResetSentAt: null,
    });

    await createUser(providerId, providerData, {
      email: EMAIL_CHEF,
      nom: "Responsable",
      prenom: "Agence",
      role: "CHEF_AGENCE",
      // Ce compte est le seul dont le mot de passe généré automatiquement
      // est directement utilisable pour se connecter (affiché en console).
      // On force son changement dès la première connexion.
      mustChangePassword: true,
      agence: { connect: { id: agence.id } },
      entreprise: { connect: { id: entreprise.id } },
      telephone: "0102030405",
      actif: true,
      isAdmin: false,
    });

    console.log(`Compte CHEF_AGENCE créé avec succès.`);
    console.log(`Identifiants de première connexion (à noter et à changer ensuite) :`);
    console.log(`  E-mail   : ${EMAIL_CHEF}`);
    console.log(`  Password : ${motDePasseInitial}`);
  } else {
    console.log(`Le compte CHEF_AGENCE (${EMAIL_CHEF}) existe déjà.`);
  }

  // Resynchronisation des séquences PostgreSQL : les createMany ci-dessus
  // insèrent des lignes avec un `id` explicite (1, 2, 3...) pour Critere,
  // Service et Canal. PostgreSQL ne fait PAS avancer automatiquement le
  // compteur auto-incrémenté dans ce cas — il reste bloqué à sa valeur de
  // départ. Sans cette resynchronisation, la première création dynamique
  // (ex. createCritere, createService) retente l'ID 1 déjà pris et échoue
  // avec `Unique constraint failed on the fields: (id)`.
  for (const table of ["Critere", "Service", "Canal"]) {
    await prismaClient.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`
    );
  }
  console.log("Séquences PostgreSQL resynchronisées (Critere, Service, Canal).");

  console.log("Seeding mono-agence terminé avec succès !");
}