import type { PrismaClient } from "@prisma/client";
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
export declare function seedEntrepriseUnique(prismaClient: PrismaClient): Promise<void>;
export declare function seedSuperAdmin(prismaClient: PrismaClient): Promise<void>;
