import type { ScoringMode, TypeReponse } from '@prisma/client';
export declare const TYPES_REPONSE: readonly ["SMILEY", "OUI_NON", "ECHELLE", "QCM", "CASES", "TEXTE", "NPS"];
export declare const MODES_SCORING: readonly ["ORDINAL", "BINARY", "NUMERIC", "SMILEY", "NPS", "CASES_CATEGORICAL", "CASES_WEIGHTED", "CES", "FREE_TEXT"];
export declare const ROLES_UTILISATEUR: readonly ["AGENT", "CHEF_AGENCE", "DIRECTION"];
export declare const STATUTS_ENTREPRISE: readonly ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"];
export declare const STATUTS_IA: readonly ["PENDING", "PROCESSING", "DONE", "FAILED"];
export declare const NIVEAUX_GRAVITE: readonly ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export declare const STATUTS_TACHE: readonly ["A_FAIRE", "EN_COURS", "TERMINEE"];
export declare const STATUTS_AVANT_TACHE: readonly ["CREATION", "A_FAIRE", "EN_COURS", "TERMINEE"];
export declare const STATUTS_ALERTE: readonly ["NOUVELLE", "TRAITEE"];
export declare const TYPES_ALERTE: readonly ["NOTE_CRITIQUE", "SILENCE_EVALUATION", "IA_INCOHERENCE_NOTE", "IA_URGENCE"];
export declare const estTypeReponse: (v: unknown) => v is "TEXTE" | "CASES" | "QCM" | "OUI_NON" | "ECHELLE" | "SMILEY" | "NPS";
export declare const estScoringMode: (v: unknown) => v is "CES" | "NUMERIC" | "SMILEY" | "NPS" | "CASES_CATEGORICAL" | "CASES_WEIGHTED" | "ORDINAL" | "BINARY" | "FREE_TEXT";
export declare const estRoleUtilisateur: (v: unknown) => v is "AGENT" | "CHEF_AGENCE" | "DIRECTION";
export declare const estStatutEntreprise: (v: unknown) => v is "ACTIVE" | "TRIAL" | "SUSPENDED" | "CANCELLED";
export declare const estStatutIa: (v: unknown) => v is "PENDING" | "PROCESSING" | "FAILED" | "DONE";
export declare const estNiveauGravite: (v: unknown) => v is "LOW" | "CRITICAL" | "HIGH" | "MEDIUM";
export declare const estStatutTache: (v: unknown) => v is "EN_COURS" | "TERMINEE" | "A_FAIRE";
export declare const estStatutAlerte: (v: unknown) => v is "TRAITEE" | "NOUVELLE";
export declare const estTypeAlerte: (v: unknown) => v is "NOTE_CRITIQUE" | "SILENCE_EVALUATION" | "IA_INCOHERENCE_NOTE" | "IA_URGENCE";
export declare const ROLES_PLATEFORME: readonly ["NONE", "SUPER_ADMIN", "SUPPORT"];
export declare const PLANS_ENTREPRISE: readonly ["STARTER", "BUSINESS", "ENTERPRISE"];
export declare const ORIENTATIONS_NOTE: readonly ["HIGHER_BETTER", "LOWER_BETTER"];
export declare const TYPES_CANAL: readonly ["QR_WEB", "USSD", "IVR_VOCAL"];
export declare const SENTIMENTS_AVIS: readonly ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"];
export declare const PERIODES_ANALYSE: readonly ["SEMAINE", "MOIS"];
export declare const NIVEAUX_CONFIANCE: readonly ["FAIBLE", "MOYENNE", "ELEVEE"];
export declare const PROVENANCES_SCORE: readonly ["EXPLICIT", "INFERRED", "MIGRATED"];
export declare const COHERENCES_NOTE: readonly ["NOTE_PLUS_HAUTE_QUE_TEXTE", "NOTE_PLUS_BASSE_QUE_TEXTE"];
export declare const estRolePlateforme: (v: unknown) => v is "NONE" | "SUPER_ADMIN" | "SUPPORT";
export declare const estPlanEntreprise: (v: unknown) => v is "STARTER" | "BUSINESS" | "ENTERPRISE";
export declare const estOrientationNote: (v: unknown) => v is "HIGHER_BETTER" | "LOWER_BETTER";
export declare const estTypeCanal: (v: unknown) => v is "QR_WEB" | "USSD" | "IVR_VOCAL";
export declare const estSentimentAvis: (v: unknown) => v is "NEUTRAL" | "POSITIVE" | "NEGATIVE" | "MIXED";
export declare const estPeriodeAnalyse: (v: unknown) => v is "SEMAINE" | "MOIS";
export declare const estNiveauConfiance: (v: unknown) => v is "MOYENNE" | "FAIBLE" | "ELEVEE";
export declare const estProvenanceScore: (v: unknown) => v is "EXPLICIT" | "INFERRED" | "MIGRATED";
export declare const estCoherenceNote: (v: unknown) => v is "NOTE_PLUS_HAUTE_QUE_TEXTE" | "NOTE_PLUS_BASSE_QUE_TEXTE";
/**
 * Modes de score admis pour chaque type de question.
 *
 * Typé `Record<TypeReponse, …>` : TypeScript exige une entrée pour chaque
 * membre de l'enum et interdit une clé inconnue. C'est ce qui garantit que
 * `NPS` ne soit pas oublié ici — c'est exactement l'oubli que la première
 * version de cette enum avait, NPS étant filtré en production par
 * `moteurGlobal.ts:272`.
 */
export declare const MODES_PAR_TYPE: Record<TypeReponse, ReadonlyArray<ScoringMode | null>>;
/** Le mode de score est-il admis pour ce type de question ? */
export declare function scoringModeAdmis(type: TypeReponse, mode: ScoringMode | null): boolean;
