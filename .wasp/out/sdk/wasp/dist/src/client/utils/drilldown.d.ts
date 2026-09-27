export type FiltresAvisUrl = {
    agence?: number | null;
    guichet?: number | null;
    service?: number | null;
    score?: number | null;
    theme?: string | null;
};
/** AAAA-MM-JJ ou '' si la valeur n'est pas une date valide. */
export declare function formaterDateUrl(v: unknown): string;
/**
 * Construit `/avis?…` avec les filtres non vides + la période optionnelle.
 * `base` vaut `routes.AvisRoute.to` ("/avis") en production, injectable en test.
 */
export declare function construireUrlAvis(filtres: FiltresAvisUrl, periode?: {
    debut?: unknown;
    fin?: unknown;
}, base?: string): string;
//# sourceMappingURL=drilldown.d.ts.map