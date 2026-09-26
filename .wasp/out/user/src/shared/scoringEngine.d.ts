export type ScoringMode = 'ORDINAL' | 'BINARY' | 'NUMERIC' | 'SMILEY' | 'NPS' | 'CASES_CATEGORICAL' | 'CASES_WEIGHTED' | 'CES' | 'FREE_TEXT';
export type Orientation = 'HIGHER_BETTER' | 'LOWER_BETTER';
/** Provenance d'un score — PAS de source IA : l'IA ne note jamais. */
export type ScoreSource = 'EXPLICIT' | 'INFERRED' | 'LEGACY_POSITIONAL' | 'MIGRATED';
export type CategorieNPS = 'DETRACTEUR' | 'PASSIF' | 'PROMOTEUR';
export type StatutResolution = 'OK' | 'NON_NOTABLE' | 'AMBIGU';
/** Provenance d'un score d'option (fournie par la couche appelante, Phase D). */
export type ProvenanceScore = 'EXPLICIT' | 'INFERRED';
/** Forme minimale d'une OptionCritere pour le moteur (pas de Prisma ici). */
export interface OptionMoteur {
    id: string;
    libelle: string;
    score: number | null;
    poids: number | null;
    est_scorable: boolean;
    actif: boolean;
    code_metier?: string | null;
}
/** Configuration d'un critère pour le moteur. */
export interface CritereMoteur {
    scoring_mode: ScoringMode | string | null;
    type_reponse: string;
    orientation?: Orientation | string | null;
    echelle_min?: number | null;
    echelle_max?: number | null;
    options: OptionMoteur[];
}
export interface ResolutionScoring {
    statut: StatutResolution;
    /** Note métier brute (1..5, valeur d'échelle, 0..10 NPS, 1..5 CASES pondéré). */
    score_officiel: number | null;
    /** Note canonique /100. NULL si non notable ou ambigu. */
    score_normalise: number | null;
    source: ScoreSource | null;
    categorie_nps?: CategorieNPS;
    /** Ids d'options retenues (stats CASES : répartition sur identifiants). */
    options_retenues: string[];
    /** Code raison (AMBIGU / NON_NOTABLE) — jamais de texte libre inventé. */
    raison?: string;
}
/** 1..5 → /100. */
export declare function note5Vers100(score: number): number;
/** Valeur d'échelle [min,max] → /100 (avec orientation). */
export declare function echelleVers100(valeur: number, min: number, max: number, orientation?: Orientation): number;
/**
 * Normalisation d'un score ordinal sur une échelle arbitraire.
 * Convention : S = max(5, plus grand score des options scorables) — les
 * échelles 1..5 historiques gardent leur mapping exact ; les échelles
 * 1..7 / 1..10 se normalisent sur leur pleine étendue. Échelle dégénérée
 * (une seule valeur distincte) → 50 neutre documenté.
 */
export declare function ordinalVers100(score: number, scoresOptions: number[]): number;
/**
 * Résout un choix unique (QCM ordinal, SMILEY) par optionId.
 * - option inconnue → AMBIGU (OPTION_INCONNUE), jamais deviné ;
 * - option inactive (retirée après collecte) → AMBIGU (OPTION_INACTIVE) ;
 * - option non scorable → NON_NOTABLE (choix catégoriel assumé par l'admin).
 */
export declare function resoudreChoixUnique(critere: CritereMoteur, optionId: string, provenance?: ProvenanceScore): ResolutionScoring;
/**
 * Oui/Non : l'orientation appartient AU CRITÈRE, pas au texte.
 * « Satisfait ? » Oui=positif ; « Problème rencontré ? » Oui=négatif.
 */
export declare function resoudreBinaire(critere: Pick<CritereMoteur, 'orientation'>, valeurOui: boolean): ResolutionScoring;
export declare function resoudreNumerique(critere: Pick<CritereMoteur, 'orientation' | 'echelle_min' | 'echelle_max'>, valeur: number): ResolutionScoring;
/**
 * CES : effort perçu, 1 = TRÈS FACILE … max = TRÈS DIFFICILE.
 * L'orientation est IMPOSÉE (LOWER_BETTER) : elle découle de la convention
 * de mesure, jamais d'une saisie admin — un « 1 » est toujours la meilleure
 * expérience, quoi que dise `critere.orientation`.
 * Échelles acceptées : 1-5 et 1-7 uniquement (voir shared/ces.ts).
 * Toute autre configuration → AMBIGU (configuration à corriger, pas d'estimation).
 */
export declare function resoudreCES(critere: Pick<CritereMoteur, 'echelle_min' | 'echelle_max'>, valeur: number): ResolutionScoring;
export declare function categorieNPS(valeur: number): CategorieNPS;
export declare function resoudreNPS(valeur: number): ResolutionScoring;
export type AgregationNPS = {
    volume: number;
    promoteurs: number;
    passifs: number;
    detracteurs: number;
    taux_promoteurs: number;
    taux_passifs: number;
    taux_detracteurs: number;
    /** % promoteurs − % détracteurs (entier, jamais une moyenne). */
    nps: number | null;
};
/** Agrégation NPS — jamais une moyenne de notes. */
export declare function agregerNPS(valeurs: number[]): AgregationNPS;
/**
 * Résout une sélection multiple par ids d'options.
 * - CATEGORICAL (ou sans scores/poids) → NON_NOTABLE + ids (stats %).
 * - WEIGHTED → base 100 + Σ(poids), clampé 0-100 ; officiel = /20 arrondi.
 * - Exclusif (« Aucun ») + autres choix → AMBIGU (EXCLUSIVITE_VIOLÉE).
 * - Sélection vide → AMBIGU (SELECTION_VIDE : rien à scorer, pas un 0).
 * - Option inconnue/inactive → AMBIGU (jamais ignorée silencieusement :
 *   ignorer un choix fausserait la moyenne ou la distribution).
 */
export declare function resoudreCases(critere: CritereMoteur, optionIds: string[], provenance?: ProvenanceScore, normaliser?: (s: string) => string): ResolutionScoring;
/**
 * Compat historique : moyenne arrondie des options scorées cochées.
 * Réservé aux CASES legacy SANS scoring_mode explicite (Phase D).
 * Ne pas utiliser pour les nouveaux questionnaires.
 */
export declare function resoudreCasesMoyenne(critere: CritereMoteur, optionIds: string[], provenance?: ProvenanceScore): ResolutionScoring;
/** Un texte libre ne devient JAMAIS une note officielle (décision validée). */
export declare function resoudreTexte(): ResolutionScoring;
export type EntreeReponse = {
    type: 'option';
    optionId: string;
} | {
    type: 'options';
    optionIds: string[];
} | {
    type: 'valeur';
    valeur: number;
} | {
    type: 'binaire';
    valeurOui: boolean;
} | {
    type: 'texte';
    texte: string;
};
/**
 * Point d'entrée unique : mode explicite > déduit du type_reponse.
 * Modes inconnus → AMBIGU (MODE_INCONNU), jamais de fallback silencieux.
 */
export declare function resoudreReponse(critere: CritereMoteur, entree: EntreeReponse, provenance?: ProvenanceScore): ResolutionScoring;
