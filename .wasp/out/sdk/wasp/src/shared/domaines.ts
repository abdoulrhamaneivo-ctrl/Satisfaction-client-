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
// Ce qui n'est PAS ici, volontairement : les libellés libres (`type_guichet`,
// `nom_agence`…), les identifiants opaques et les horodatages textuels. Un jeu
// de valeurs n'entre ici que lorsqu'il traverse une frontière non typée
// (client, CSV, IA) avec un domaine fermé attesté en code.
// ============================================================================
import type {
  CoherenceNote,
  NiveauConfiance,
  NiveauGravite,
  OrientationNote,
  PeriodeAnalyse,
  PlanEntreprise,
  PlatformRole,
  ProvenanceScore,
  RoleUtilisateur,
  ScoringMode,
  SentimentAvis,
  StatutAlerte,
  StatutAvantTache,
  StatutEntreprise,
  StatutIa,
  StatutTache,
  TypeAlerte,
  TypeCanal,
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

export const ROLES_PLATEFORME = ['NONE', 'SUPER_ADMIN', 'SUPPORT'] as const satisfies readonly PlatformRole[];

export const PLANS_ENTREPRISE = ['STARTER', 'BUSINESS', 'ENTERPRISE'] as const satisfies readonly PlanEntreprise[];

export const ORIENTATIONS_NOTE = ['HIGHER_BETTER', 'LOWER_BETTER'] as const satisfies readonly OrientationNote[];

export const TYPES_CANAL = ['QR_WEB', 'USSD', 'IVR_VOCAL'] as const satisfies readonly TypeCanal[];

export const SENTIMENTS_AVIS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'] as const satisfies readonly SentimentAvis[];

export const PERIODES_ANALYSE = ['SEMAINE', 'MOIS'] as const satisfies readonly PeriodeAnalyse[];

export const NIVEAUX_CONFIANCE = ['FAIBLE', 'MOYENNE', 'ELEVEE'] as const satisfies readonly NiveauConfiance[];

export const PROVENANCES_SCORE = ['EXPLICIT', 'INFERRED', 'MIGRATED'] as const satisfies readonly ProvenanceScore[];

export const COHERENCES_NOTE = [
  'NOTE_PLUS_HAUTE_QUE_TEXTE',
  'NOTE_PLUS_BASSE_QUE_TEXTE',
] as const satisfies readonly CoherenceNote[];

export const estRolePlateforme = creerGarde(ROLES_PLATEFORME);
export const estPlanEntreprise = creerGarde(PLANS_ENTREPRISE);
export const estOrientationNote = creerGarde(ORIENTATIONS_NOTE);
export const estTypeCanal = creerGarde(TYPES_CANAL);
export const estSentimentAvis = creerGarde(SENTIMENTS_AVIS);
export const estPeriodeAnalyse = creerGarde(PERIODES_ANALYSE);
export const estNiveauConfiance = creerGarde(NIVEAUX_CONFIANCE);
export const estProvenanceScore = creerGarde(PROVENANCES_SCORE);
export const estCoherenceNote = creerGarde(COHERENCES_NOTE);

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
