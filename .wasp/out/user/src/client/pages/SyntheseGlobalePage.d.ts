import React from 'react';
export declare function parseJson<T>(brut: string | null | undefined, defaut: T): T;
export declare function libellePeriode(ligne: any): string;
/**
 * Intervalle de rafraîchissement de la liste des analyses.
 *
 * TanStack Query v4 : le 1er argument est la DONNÉE (TData | undefined), pas
 * la query. La forme v5 `(q) => q.state.data…` lève `TypeError` au montage
 * (données encore `undefined`) → page blanche /synthese, attrapée par le
 * routeur. Testé ci-dessous : toute réintroduction de `q.state` doit faire
 * échouer `SyntheseGlobalePage.test.ts`.
 */
export declare function intervalleActualisationSynthese(donnees: unknown): number | false;
export declare const SyntheseGlobalePage: React.FC;
export default SyntheseGlobalePage;
