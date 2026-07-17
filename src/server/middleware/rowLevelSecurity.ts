// src/server/middleware/rowLevelSecurity.ts
// ============================================================================
// Row-Level Security (RLS) — Isolation multi-tenant CXSAT
// ============================================================================
// MODULE UNIQUE ET CANONIQUE pour toutes les vérifications de permission.
// Toute query/action métier DOIT passer par ces helpers — aucune vérification
// de rôle/agence/entreprise ne doit être réécrite à la main ailleurs.
// (Anciennement dupliqué avec src/server/permissions.ts, supprimé : voir
// l'historique du rapport d'audit pour le détail des failles corrigées.)
//
// Hiérarchie des données : Entreprise (tenant) → Agence → Guichet / User.
//
// Portée des rôles :
//   - DIRECTION / QUALITE : toute l'ENTREPRISE (toutes ses agences), jamais
//     la plateforme entière.
//   - CHEF_AGENCE / AGENT : une seule AGENCE.
//
// Architecture :
//   - requireAuth(context)                    → vérifie que l'user est connecté
//   - requireRole(context, roles)              → vérifie le rôle
//   - requireManagementRole(context)           → rôle de gestion (DIRECTION/QUALITE/CHEF_AGENCE)
//   - getEntrepriseAgenceIds(context, entities)→ ids de toutes les agences de l'entreprise de l'user
//   - buildAgenceFilter(context, entities)     → filtre Prisma { id_agence } ou { id_agence: { in: [...] } }
//   - assertAgenceAccess(context, entities, id)→ vérifie qu'un id_agence cible est dans le périmètre
//   - resolveAgenceId(context, entities, id?)  → id d'agence effectif à utiliser (vérifié)
// ============================================================================

import { HttpError } from 'wasp/server';

// ─────────────────────────────────────────────
// Types internes
// ─────────────────────────────────────────────

export interface WaspContext {
  user?: {
    id: string;
    role?: string | null;
    id_agence?: number | null;
    id_entreprise?: number | null;
    isAdmin?: boolean;
    actif?: boolean;
  } | null;
  entities: Record<string, any>;
}

export type CXSATRole =
  | 'DIRECTION'
  | 'QUALITE'
  | 'CHEF_AGENCE'
  | 'AGENT';

/** Rôles dont la portée est l'entreprise entière (toutes les agences du tenant). */
const ENTREPRISE_WIDE_ROLES: CXSATRole[] = ['DIRECTION', 'QUALITE'];

// ─────────────────────────────────────────────
// 1. Authentification
// ─────────────────────────────────────────────

/**
 * Vérifie que le contexte contient un utilisateur connecté et actif.
 * Lève une HttpError 401 si non connecté, 403 si le compte est suspendu.
 */
export function requireAuth(
  context: WaspContext
): asserts context is WaspContext & { user: NonNullable<WaspContext['user']> } {
  if (!context.user) {
    throw new HttpError(401, 'Vous devez être connecté pour accéder à cette ressource.');
  }
  if (context.user.actif === false) {
    throw new HttpError(403, 'Votre compte a été suspendu par la direction. Contactez votre administrateur.');
  }
}

// ─────────────────────────────────────────────
// 2. Rôles
// ─────────────────────────────────────────────

/**
 * Vérifie que l'utilisateur possède l'un des rôles autorisés.
 * Lève une HttpError 403 sinon.
 */
export function requireRole(context: WaspContext, roles: CXSATRole[]): void {
  requireAuth(context);
  const userRole = context.user!.role as CXSATRole | null | undefined;
  if (!userRole || !roles.includes(userRole)) {
    throw new HttpError(403, `Accès réservé aux profils : ${roles.join(', ')}.`);
  }
}

/**
 * Vérifie que l'utilisateur est administrateur de la plateforme (indépendant
 * des rôles métier CXSAT — réservé aux opérations propres à l'éditeur SaaS,
 * ex. tarification globale).
 */
export function requireAdmin(context: WaspContext): void {
  requireAuth(context);
  if (!context.user!.isAdmin) {
    throw new HttpError(403, 'Accès réservé aux administrateurs CXSAT.');
  }
}

/**
 * Vérifie auth + rôle de gestion (DIRECTION, QUALITE, CHEF_AGENCE).
 */
export function requireManagementRole(context: WaspContext): void {
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);
}

// ─────────────────────────────────────────────
// 3. Isolation par entreprise + agence (RLS)
// ─────────────────────────────────────────────

/**
 * Retourne la liste des ids d'agence appartenant à l'entreprise de l'utilisateur.
 * Nécessite `entities.Agence` dans le contexte de l'action/query appelante.
 */
export async function getEntrepriseAgenceIds(context: WaspContext, entities: any): Promise<number[]> {
  requireAuth(context);
  const { id_entreprise } = context.user!;
  if (!id_entreprise) {
    throw new HttpError(400, "Votre compte n'est rattaché à aucune entreprise. Contactez l'administrateur technique de CXSAT.");
  }
  const agences = await entities.Agence.findMany({
    where: { id_entreprise },
    select: { id: true },
  });
  return agences.map((a: { id: number }) => a.id);
}

/**
 * Vérifie que l'utilisateur est rattaché à une agence.
 * - CHEF_AGENCE / AGENT : retourne leur unique id_agence.
 * - DIRECTION / QUALITE : n'ont pas de notion d'agence unique → lève une erreur ;
 *   utiliser buildAgenceFilter/getEntrepriseAgenceIds pour leur portée entreprise.
 */
export function requireAgence(context: WaspContext): number {
  requireAuth(context);
  const { id_agence } = context.user!;
  if (!id_agence) {
    throw new HttpError(400, "Votre compte n'est pas rattaché à une agence. Contactez votre Chef d'Agence ou l'administrateur technique de CXSAT.");
  }
  return id_agence;
}

/**
 * Construit le filtre Prisma pour isoler les données au niveau `id_agence` :
 * - DIRECTION / QUALITE : `{ id_agence: { in: [...toutes les agences de l'entreprise] } }`
 *   (jamais `{}` — sinon fuite de données entre entreprises clientes du SaaS).
 * - Autres rôles : `{ id_agence: <idAgenceUtilisateur> }`
 *
 * Nécessite `entities.Agence` déclaré dans l'action/query appelante.
 */
export async function buildAgenceFilter(
  context: WaspContext,
  entities: any
): Promise<{ id_agence: number | { in: number[] } }> {
  requireAuth(context);
  const role = context.user!.role as CXSATRole | null | undefined;

  if (role && ENTREPRISE_WIDE_ROLES.includes(role)) {
    const agenceIds = await getEntrepriseAgenceIds(context, entities);
    return { id_agence: { in: agenceIds } };
  }

  return { id_agence: requireAgence(context) };
}

/**
 * Vérifie qu'un enregistrement cible appartient bien au périmètre de
 * l'utilisateur (son agence, ou une agence de son entreprise pour
 * DIRECTION/QUALITE). À utiliser AVANT toute lecture/modification d'un
 * enregistrement identifié par son `id_agence`.
 *
 * `recordIdAgence` doit toujours être une valeur explicitement fournie et
 * validée en amont (jamais `undefined` silencieusement accepté) : c'est
 * l'appelant qui doit garantir que l'id existe avant d'appeler cette fonction.
 */
export async function assertAgenceAccess(
  context: WaspContext,
  entities: any,
  recordIdAgence: number,
  resourceName = 'ressource'
): Promise<void> {
  requireAuth(context);
  if (recordIdAgence === undefined || recordIdAgence === null || Number.isNaN(recordIdAgence)) {
    throw new HttpError(400, `Identifiant d'agence manquant ou invalide pour cette ${resourceName}.`);
  }

  const role = context.user!.role as CXSATRole | null | undefined;
  const { id_agence } = context.user!;

  if (role && ENTREPRISE_WIDE_ROLES.includes(role)) {
    const agenceIds = await getEntrepriseAgenceIds(context, entities);
    if (!agenceIds.includes(recordIdAgence)) {
      throw new HttpError(403, `Accès refusé : cette ${resourceName} appartient à une autre entreprise.`);
    }
    return;
  }

  if (id_agence !== recordIdAgence) {
    throw new HttpError(403, `Accès refusé : cette ${resourceName} appartient à une autre agence.`);
  }
}

/**
 * Vérifie que l'utilisateur peut gérer la cible `targetAgenceId` (alias
 * sémantique de assertAgenceAccess pour les opérations d'écriture/gestion).
 */
export async function assertCanManageAgence(
  context: WaspContext,
  entities: any,
  targetAgenceId: number
): Promise<void> {
  return assertAgenceAccess(context, entities, targetAgenceId, "agence");
}

/**
 * Retourne l'id d'agence effectif à utiliser pour une requête, en le
 * VÉRIFIANT systématiquement (jamais un simple `??` non contrôlé) :
 * - Si `overrideIdAgence` est fourni : vérifie qu'il est dans le périmètre de
 *   l'utilisateur (sa propre agence, ou une agence de son entreprise pour
 *   DIRECTION/QUALITE) via assertAgenceAccess, puis le retourne.
 * - Sinon : retourne l'agence de l'utilisateur (erreur si DIRECTION/QUALITE
 *   sans agence de rattachement et sans override — elles doivent alors
 *   préciser explicitement l'agence visée).
 */
export async function resolveAgenceId(
  context: WaspContext,
  entities: any,
  overrideIdAgence?: number
): Promise<number> {
  requireAuth(context);

  if (overrideIdAgence !== undefined && overrideIdAgence !== null) {
    await assertAgenceAccess(context, entities, overrideIdAgence);
    return overrideIdAgence;
  }

  return requireAgence(context);
}

/**
 * Version "scope" de resolveAgenceId : au lieu de forcer une agence unique,
 * retourne un filtre Prisma compatible avec les deux cas :
 * - `overrideIdAgence` fourni (drill-down explicite) → `{ id_agence: <id> }`
 *   après vérification d'accès.
 * - Sinon → `buildAgenceFilter` : agence unique pour CHEF_AGENCE/AGENT, ou
 *   `{ id_agence: { in: [...] } }` pour TOUTES les agences de l'entreprise
 *   si DIRECTION/QUALITE.
 *
 * À utiliser à la place de `resolveAgenceId` dans toute query dont le
 * résultat doit être consultable par DIRECTION/QUALITE au niveau entreprise
 * (dashboards, statistiques agrégées). `resolveAgenceId` reste adapté aux
 * écrans nécessairement rattachés à une agence précise (planning du jour,
 * gestion des agents d'une agence, etc.).
 */
export async function resolveAgenceScope(
  context: WaspContext,
  entities: any,
  overrideIdAgence?: number
): Promise<{ id_agence: number | { in: number[] } }> {
  requireAuth(context);

  if (overrideIdAgence !== undefined && overrideIdAgence !== null) {
    await assertAgenceAccess(context, entities, overrideIdAgence);
    return { id_agence: overrideIdAgence };
  }

  return buildAgenceFilter(context, entities);
}

