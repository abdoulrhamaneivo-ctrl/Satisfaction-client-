/** Construct mesuré par la satisfaction moyenne (toute autre chose est exclue). */
export type ReponseSatisfaction = {
    score_brut?: number | null;
    score_normalise?: number | null;
    critere?: {
        type_reponse?: string | null;
        scoring_mode?: string | null;
        options_reponse?: string | null;
    } | null;
};
/** Ce critère relève-t-il de la satisfaction moyenne ? */
export declare function estCritereSatisfaction(critere: ReponseSatisfaction['critere']): boolean;
/**
 * Note de satisfaction sur 5, ou `null` si la réponse n'en porte pas
 * (texte, choix catégoriel, NPS, CES, ou configuration illisible).
 * Échelle de sortie bornée à [1, 5] : un 0/100 est une étoile, pas un zéro.
 */
export declare function noteSur5(r: ReponseSatisfaction | null | undefined): number | null;
/** Notes de satisfaction d'une liste de réponses, dans l'ordre. */
export declare function notesSur5(reponses: ReponseSatisfaction[]): number[];
/** Moyenne de satisfaction sur 5, ou `null` si aucune réponse notable. */
export declare function moyenneSur5(reponses: ReponseSatisfaction[]): number | null;
