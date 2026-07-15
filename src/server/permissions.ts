// src/server/permissions.ts
// ============================================================================
// Row-Level Security (RLS) centralisé — Isolation multi-tenant CXSAT
// Toutes les queries/actions importent depuis ce fichier.
// ============================================================================
import { HttpError } from 'wasp/server';

export type CXSATRole = 'DIRECTION' | 'QUALITE' | 'CHEF_AGENCE' | 'AGENT';

// ─────────────────────────────────────────────
// Helpers existants (rétrocompatibles)
// ─────────────────────────────────────────────

/** Retourne le filtre Prisma { id_agence } ou {} pour DIRECTION */
export const getAgencyFilter = (user: any): { id_agence?: number } => {
  if (user.role === 'DIRECTION') return {};
  return { id_agence: user.id_agence };
};

/** Vérifie que l'user peut accéder à une agence donnée */
export const assertAgencyAccess = (user: any, requestedAgenceId?: number) => {
  if (user.role === 'DIRECTION') return;
  if (!user.id_agence) throw new HttpError(403, 'Accès refusé: aucune agence liée.');
  if (requestedAgenceId && requestedAgenceId !== user.id_agence) {
    throw new HttpError(403, "Accès refusé à une autre agence.");
  }
};

// ─────────────────────────────────────────────
// Nouveaux helpers RLS (étendus)
// ─────────────────────────────────────────────

/** Lève 401 si l'user n'est pas connecté, 403 si son compte est suspendu */
export function requireAuth(context: { user?: any }): void {
  if (!context.user) {
    throw new HttpError(401, 'Vous devez être connecté pour accéder à cette ressource.');
  }
  if (context.user.actif === false) {
    throw new HttpError(403, 'Votre compte a été suspendu par la direction. Contactez votre administrateur.');
  }
}

/** Lève 403 si l'user n'a pas l'un des rôles requis */
export function requireRole(context: { user?: any }, roles: CXSATRole[]): void {
  requireAuth(context);
  if (!roles.includes(context.user.role as CXSATRole)) {
    throw new HttpError(403, `Accès réservé aux profils : ${roles.join(', ')}.`);
  }
}

/** Retourne l'id d'agence effectif (override autorisé seulement pour DIRECTION) */
export function resolveAgenceId(context: { user?: any }, overrideIdAgence?: number): number {
  requireAuth(context);
  const { role, id_agence } = context.user;
  if (overrideIdAgence !== undefined && role === 'DIRECTION') return overrideIdAgence;
  if (!id_agence) throw new HttpError(400, "Agence introuvable. Finalisez l'onboarding.");
  return id_agence;
}

/** Vérifie qu'un enregistrement appartient bien à l'agence de l'user */
export function assertAgenceAccess(
  context: { user?: any },
  recordIdAgence: number,
  resourceName = 'ressource'
): void {
  requireAuth(context);
  const { role, id_agence } = context.user;
  if (role === 'DIRECTION') return;
  if (id_agence !== recordIdAgence) {
    throw new HttpError(403, `Accès refusé : cette ${resourceName} appartient à une autre agence.`);
  }
}

/** Alias sémantique : vérifie auth + rôle de gestion */
export function requireManagementRole(context: { user?: any }): void {
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);
}