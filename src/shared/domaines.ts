// src/shared/domaines.ts
// ============================================================================
// VAGUE 7 — Domaines de valeurs : une seule déclaration, deux utilisations.
//
// L'enum Prisma porte la contrainte EN BASE. Ce module porte la même
// déclaration côté applicatif, pour deux besoins qu'un enum seul ne couvre
// pas : lire une valeur qui arrive du client ou d'un CSV, et donner un type
// à une variable après validation.
//
// Le lien entre les deux est garanti à la compilation, pas par une
// convention : les listes ci-dessous sont typées par le type enum, et les
// tables le sont par `Record<TypeEnum, …>`. Ajouter une valeur à l'enum
// casse donc la compilation ici tant que le domaine applicatif n'est pas
// mis à jour — et l'inverse également.
//
// Ce qui n'est PAS ici, volontairement : les 14 autres jeux de valeurs du
// schéma. Ceux-là n'ont pas de chemin d'écriture attesté, donc les
// inventorier serait du bruit. Un jeu de valeurs n'entre ici que lorsqu'il
// traverse une frontière non typée (client, CSV, IA).
// ============================================================================
import type {
  NiveauGravite,
  RoleUtilisateur,
  ScoringMode,
  StatutAlerte,
  StatutAvantTache,
  StatutEntreprise,
  StatutIa,
  StatutTache,
  TypeAlerte,
  TypeReponse,
} from '@prisma/client';

/**
 * Convertit `unknown` en type du domaine, sans cast.
 *
 * Le `Set` est construit à partir d'une liste littérale, et la liste est
 * validée contre l'enum par `satisfies` : impossible d'accepter une valeur
 * que la base refuserait.
 */
function creerGarde<T extends string>(valeurs: readonly T[]) {
  const ensemble = new Set<string>(valeurs);
  return (v: unknown): v is T => typeof v === 'string' && ensemble.has(v);
}

export const TYPES_REPONSE = [
  'SMILEY',
  'OUI_NON',
  'ECHELLE',
  'QCM',
  'CASES',
  'TEXTE',
  'NPS',
] as const satisfies readonly TypeReponse[];

export const MODES_SCORING = [
  'ORDINAL',
  'BINARY',
  'NUMERIC',
  'SMILEY',
  'NPS',
  'CASES_CATEGORICAL',
  'CASES_WEIGHTED',
  'CES',
  'FREE_TEXT',
] as const satisfies readonly ScoringMode[];

export const ROLES_UTILISATEUR = ['AGENT', 'CHEF_AGENCE', 'DIRECTION'] as const satisfies readonly RoleUtilisateur[];

export const STATUTS_ENTREPRISE = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'] as const satisfies readonly StatutEntreprise[];

export const STATUTS_IA = ['PENDING', 'PROCESSING', 'DONE', 'FAILED'] as const satisfies readonly StatutIa[];

export const NIVEAUX_GRAVITE = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const satisfies readonly NiveauGravite[];

export const STATUTS_TACHE = ['A_FAIRE', 'EN_COURS', 'TERMINEE'] as const satisfies readonly StatutTache[];

export const STATUTS_AVANT_TACHE = [
  'CREATION',
  'A_FAIRE',
  'EN_COURS',
  'TERMINEE',
] as const satisfies readonly StatutAvantTache[];

export const STATUTS_ALERTE = ['NOUVELLE', 'TRAITEE'] as const satisfies readonly StatutAlerte[];

export const TYPES_ALERTE = [
  'NOTE_CRITIQUE',
  'SILENCE_EVALUATION',
  'IA_INCOHERENCE_NOTE',
  'IA_URGENCE',
] as const satisfies readonly TypeAlerte[];

export const estTypeReponse = creerGarde(TYPES_REPONSE);
export const estScoringMode = creerGarde(MODES_SCORING);
export const estRoleUtilisateur = creerGarde(ROLES_UTILISATEUR);
export const estStatutEntreprise = creerGarde(STATUTS_ENTREPRISE);
export const estStatutIa = creerGarde(STATUTS_IA);
export const estNiveauGravite = creerGarde(NIVEAUX_GRAVITE);
export const estStatutTache = creerGarde(STATUTS_TACHE);
export const estStatutAlerte = creerGarde(STATUTS_ALERTE);
export const estTypeAlerte = creerGarde(TYPES_ALERTE);

/**
 * Modes de score admis pour chaque type de question.
 *
 * Typé `Record<TypeReponse, …>` : TypeScript exige une entrée pour chaque
 * membre de l'enum et interdit une clé inconnue. C'est ce qui garantit que
 * `NPS` ne soit pas oublié ici — c'est exactement l'oubli que la première
 * version de cette enum avait, NPS étant filtré en production par
 * `moteurGlobal.ts:272`.
 */
export const MODES_PAR_TYPE: Record<TypeReponse, ReadonlyArray<ScoringMode | null>> = {
  SMILEY: ['SMILEY', null],
  OUI_NON: ['BINARY', null],
  QCM: ['ORDINAL', null],
  TEXTE: ['FREE_TEXT', null],
  ECHELLE: ['NUMERIC', 'CES', null],
  NPS: ['NPS', null],
  CASES: ['CASES_CATEGORICAL', 'CASES_WEIGHTED', null],
};

/** Le mode de score est-il admis pour ce type de question ? */
export function scoringModeAdmis(type: TypeReponse, mode: ScoringMode | null): boolean {
  return mode === null || (MODES_PAR_TYPE[type] ?? []).includes(mode);
}
