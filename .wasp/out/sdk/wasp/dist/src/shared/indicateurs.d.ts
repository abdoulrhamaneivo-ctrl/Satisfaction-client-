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
    /**
     * Nombre d'analyses IA réellement produites sur la période — DÉNOMINATEUR
     * de la cohérence. Avant le 2026-09-27, on divisait par `totalReponses`,
     * ce qui affichait « 98 % cohérence » quand l'IA n'avait analysé que 10 %
     * des lignes (toutes incohérentes). La cohérence se mesure sur ce qui a
     * été analysé, pas sur tout ce qui a été collecté.
     */
    totalAnalyses: number;
}
/**
 * DATA_QUALITY_SCORE (§31) — qualité TECHNIQUE des données, 4 composantes
 * en [0,1] : notables 40 % + cohérence 25 % + (1 − legacy) 20 % + volume
 * (saturé à 50) 15 %. Chaque terme est explicable séparément.
 *
 * Correctif 2026-09-27 : le taux de commentaires (20 %) est SORTI du score
 * technique. Un avis parfaitement noté et exploitable perdait jusqu'à 20
 * points parce que le client n'avait rien écrit — « absence de commentaire »
 * n'est pas « mauvaise qualité de donnée ». Le taux reste exposé dans
 * `details.commentaires` à titre INFORMATIF (poids 0) ; la présence et la
 * substance des verbatims sont mesurées par QUALITATIVE_RICHNESS_SCORE
 * (`scoreRichesseQualitative` ci-dessous), affiché à côté, jamais mélangé.
 */
export declare function scoreQualiteDonnees(e: EntreesQualite): {
    score: number;
    details: Record<'notables' | 'commentaires' | 'coherence' | 'fraicheur_legacy' | 'volume', number>;
};
export interface EntreesRichesse {
    totalReponses: number;
    avecCommentaire: number;
    /** Commentaires de ≥ 20 caractères après trim : présence + substance. */
    commentairesSubstantiels: number;
}
/**
 * QUALITATIVE_RICHNESS_SCORE — richesse QUALITATIVE du matériau d'analyse,
 * 2 composantes en [0,1] : présence de commentaires 50 % + verbatims
 * substantiels 50 %. Un avis noté sans texte vaut 0 ici ET 100 en technique
 * (`notables`) — les deux scores se lisent côte à côte, ils ne se
 * compensent jamais. Seuil de substance : 20 caractères (un « merci ! » ne
 * fait pas un verbatim exploitable, mais compte en présence).
 */
export declare function scoreRichesseQualitative(e: EntreesRichesse): {
    score: number;
    details: Record<'commentaires' | 'substantiels', number>;
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
//# sourceMappingURL=indicateurs.d.ts.map