import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import { type User } from "wasp/entities";
import {
  getSubscriptionPaymentPlanIds,
  SubscriptionStatus,
} from "../../payment/plans";

type MockUserData = Omit<User, 'id' | 'nom' | 'prenom' | 'telephone' | 'role' | 'actif' | 'id_agence' | 'id_entreprise' | 'sendEmail'>;

/**
 * Cette fonction initialise la base de données PostgreSQL avec nos données métiers CXSAT,
 * puis génère les utilisateurs de démonstration d'Open SaaS en arrière-plan.
 */
export async function seedMockUsers(prismaClient: PrismaClient) {
  
  // ==========================================================================
  // 1. SEEDING DES DONNÉES DE BASE CXSAT ABIDJAN (NOTRE PROJET)
  // ==========================================================================
  
  console.log('Création des critères d\'évaluation de base (Norme FD X50-167)...');
  await prismaClient.critere.createMany({
    data: [
      { id: 1, libelle_critere: "Temps d'attente", description: "Temps mis avant d'être servi au guichet" },
      { id: 2, libelle_critere: "Accueil guichetier", description: "Politesse et amabilité de l'agent" },
      { id: 3, libelle_critere: "Clarté des informations", description: "Clarté des explications fournies" }
    ],
    skipDuplicates: true,
  });

  console.log('Création des types de services de base d\'Abidjan...');
  await prismaClient.service.createMany({
    data: [
      { id: 1, libelle_service: "Retrait d'argent / Mobile Money" },
      { id: 2, libelle_service: "Envoi ou réception de colis" },
      { id: 3, libelle_service: "Opération Épargne / Dépôt" }
    ],
    skipDuplicates: true,
  });

  console.log('Création des canaux de communication inclusifs...');
  await prismaClient.canal.createMany({
    data: [
      { id: 1, type_canal: "QR_WEB", langue_utilisee: "Français" },
      { id: 2, type_canal: "USSD", langue_utilisee: "Dioula" },
      { id: 3, type_canal: "IVR_VOCAL", langue_utilisee: "Baoulé" }
    ],
    skipDuplicates: true,
  });

  console.log("Pré-remplissage CXSAT Abidjan terminé avec succès !");

  // ==========================================================================
  // 2. SEEDING DES UTILISATEURS DE TEST PAR DÉFAUT D'OPEN SAAS
  // ==========================================================================
  
  console.log('Génération des utilisateurs de test Open SaaS en cours...');
  await Promise.all(
    generateMockUsersData(50).map((data) => prismaClient.user.create({ data })),
  );
  
  console.log('Seeding global terminé !');
}

// === GÉNÉRATEURS DE DONNÉES FICTIVES D'ORIGINE D'OPEN SAAS (Laissés intacts) ===

function generateMockUsersData(numOfUsers: number): MockUserData[] {
  return faker.helpers.multiple(generateMockUserData, { count: numOfUsers });
}

function generateMockUserData(): MockUserData {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const subscriptionStatus =
    faker.helpers.arrayElement<SubscriptionStatus | null>([
      ...Object.values(SubscriptionStatus),
      null,
    ]);
  const now = new Date();
  const createdAt = faker.date.past({ refDate: now });
  const timePaid = faker.date.between({ from: createdAt, to: now });
  const credits = subscriptionStatus
    ? 0
    : faker.number.int({ min: 0, max: 10 });
  const hasUserPaidOnStripe = !!subscriptionStatus || credits > 3;
  return {
    email: faker.internet.email({ firstName, lastName }),
    username: faker.internet.userName({ firstName, lastName }),
    createdAt,
    isAdmin: false,
    credits,
    subscriptionStatus,
    lemonSqueezyCustomerPortalUrl: null,
    paymentProcessorUserId: hasUserPaidOnStripe
      ? `cus_test_${faker.string.uuid()}`
      : null,
    datePaid: hasUserPaidOnStripe
      ? faker.date.between({ from: createdAt, to: timePaid })
      : null,
    subscriptionPlan: subscriptionStatus
      ? faker.helpers.arrayElement(getSubscriptionPaymentPlanIds())
      : null,
  };
}