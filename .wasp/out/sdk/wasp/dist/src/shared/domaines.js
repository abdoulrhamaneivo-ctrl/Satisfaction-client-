/**
 * Convertit `unknown` en type du domaine, sans cast.
 *
 * Le `Set` est construit à partir d'une liste littérale, et la liste est
 * validée contre l'enum par `satisfies` : impossible d'accepter une valeur
 * que la base refuserait.
 */
function creerGarde(valeurs) {
    const ensemble = new Set(valeurs);
    return (v) => typeof v === 'string' && ensemble.has(v);
}
export const TYPES_REPONSE = [
    'SMILEY',
    'OUI_NON',
    'ECHELLE',
    'QCM',
    'CASES',
    'TEXTE',
    'NPS',
];
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
];
export const ROLES_UTILISATEUR = ['AGENT', 'CHEF_AGENCE', 'DIRECTION'];
export const STATUTS_ENTREPRISE = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];
export const STATUTS_IA = ['PENDING', 'PROCESSING', 'DONE', 'FAILED'];
export const NIVEAUX_GRAVITE = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const STATUTS_TACHE = ['A_FAIRE', 'EN_COURS', 'TERMINEE'];
export const STATUTS_AVANT_TACHE = [
    'CREATION',
    'A_FAIRE',
    'EN_COURS',
    'TERMINEE',
];
export const STATUTS_ALERTE = ['NOUVELLE', 'TRAITEE'];
export const TYPES_ALERTE = [
    'NOTE_CRITIQUE',
    'SILENCE_EVALUATION',
    'IA_INCOHERENCE_NOTE',
    'IA_URGENCE',
];
export const estTypeReponse = creerGarde(TYPES_REPONSE);
export const estScoringMode = creerGarde(MODES_SCORING);
export const estRoleUtilisateur = creerGarde(ROLES_UTILISATEUR);
export const estStatutEntreprise = creerGarde(STATUTS_ENTREPRISE);
export const estStatutIa = creerGarde(STATUTS_IA);
export const estNiveauGravite = creerGarde(NIVEAUX_GRAVITE);
export const estStatutTache = creerGarde(STATUTS_TACHE);
export const estStatutAlerte = creerGarde(STATUTS_ALERTE);
export const estTypeAlerte = creerGarde(TYPES_ALERTE);
export const ROLES_PLATEFORME = ['NONE', 'SUPER_ADMIN', 'SUPPORT'];
export const PLANS_ENTREPRISE = ['STARTER', 'BUSINESS', 'ENTERPRISE'];
export const ORIENTATIONS_NOTE = ['HIGHER_BETTER', 'LOWER_BETTER'];
export const TYPES_CANAL = ['QR_WEB', 'USSD', 'IVR_VOCAL'];
export const SENTIMENTS_AVIS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'];
export const PERIODES_ANALYSE = ['SEMAINE', 'MOIS'];
export const NIVEAUX_CONFIANCE = ['FAIBLE', 'MOYENNE', 'ELEVEE'];
export const PROVENANCES_SCORE = ['EXPLICIT', 'INFERRED', 'MIGRATED'];
export const COHERENCES_NOTE = [
    'NOTE_PLUS_HAUTE_QUE_TEXTE',
    'NOTE_PLUS_BASSE_QUE_TEXTE',
];
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
export const MODES_PAR_TYPE = {
    SMILEY: ['SMILEY', null],
    OUI_NON: ['BINARY', null],
    QCM: ['ORDINAL', null],
    TEXTE: ['FREE_TEXT', null],
    ECHELLE: ['NUMERIC', 'CES', null],
    NPS: ['NPS', null],
    CASES: ['CASES_CATEGORICAL', 'CASES_WEIGHTED', null],
};
/** Le mode de score est-il admis pour ce type de question ? */
export function scoringModeAdmis(type, mode) {
    return mode === null || (MODES_PAR_TYPE[type] ?? []).includes(mode);
}
//# sourceMappingURL=domaines.js.map