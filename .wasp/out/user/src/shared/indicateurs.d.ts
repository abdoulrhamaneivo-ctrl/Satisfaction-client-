export type SourceIndicateur = 'reponses' | 'analyse_ia' | 'mixte' | 'operationnel';
export interface DefinitionIndicateur {
    id: string;
    label: string;
    description: string;
    formule: string;
    source: SourceIndicateur;
    unite: '/100' | '%' | 'nombre' | 'indice' | 'texte';
}
/** Bandes CSAT sur /100 (seule référence — §33). */
export declare const BANDES_CSAT: readonly [{
    readonly id: "tres_satisfaits";
    readonly label: "Très satisfaits";
    readonly min: 80;
}, {
    readonly id: "satisfaits";
    readonly label: "Satisfaits";
    readonly min: 60;
}, {
    readonly id: "neutres";
    readonly label: "Neutres";
    readonly min: 40;
}, {
    readonly id: "insatisfaits";
    readonly label: "Insatisfaits";
    readonly min: 20;
}, {
    readonly id: "tres_insatisfaits";
    readonly label: "Très insatisfaits";
    readonly min: 0;
}];
export declare const CATALOGUE_INDICATEURS: DefinitionIndicateur[];
/** Distribution d'une liste de notes /100 vers les bandes CSAT. */
export declare function distributionBandends(notes100: number[]): Record<string, number>;
export declare function mediane(notes: number[]): number | null;
export interface EntreesTauxReponse {
    visiteursEstimes?: number | null;
    questionnairesTermines: number;
}
/**
 * Taux de réponse (§32) : sans dénominateur fiable, N/A — jamais 0 %,
 * jamais une estimation déguisée.
 */
export declare function tauxReponse(e: EntreesTauxReponse): {
    taux: number | null;
    statut: 'OK' | 'N/A';
};
export interface EntreesQualite {
    totalReponses: number;
    notables: number;
    avecCommentaire: number;
    incoherentes: number;
    legacy: number;
    inferees: number;
}
/**
 * DATA_QUALITY_SCORE (§31) — 5 composantes documentées, toutes en [0,1] :
 * notables 35 % + commentées 20 % + cohérence 20 % + (1 − legacy) 15 % +
 * volume (saturé à 50) 10 %. Chaque terme est explicable séparément.
 */
export declare function scoreQualiteDonnees(e: EntreesQualite): {
    score: number;
    details: Record<'notables' | 'commentaires' | 'coherence' | 'fraicheur_legacy' | 'volume', number>;
};
/** Cherche une définition au catalogue (affichage « d'où vient ce chiffre »). */
export declare function definitionIndicateur(id: string): DefinitionIndicateur | null;
export interface EntreesIndice {
    /** CSAT /100 (toujours requis). */
    csat: number;
    /** NPS −100..+100 (optionnel). */
    nps?: number | null;
    /** CES /100 (optionnel, si question d'effort). */
    ces?: number | null;
}
/**
 * Indice global d'expérience /100 (§49, zone 1) — formule DOCUMENTÉE :
 * CSAT seul par défaut ; 60 % CSAT + 40 % NPS normalisé ((nps+100)/2) si
 * NPS disponible ; CES remplace 20 % du CSAT quand présent. Jamais de
 * composition cachée : la formule voyage avec la valeur (voir query).
 */
export declare function indiceGlobalExperience(e: EntreesIndice): {
    indice: number;
    formule: string;
};
