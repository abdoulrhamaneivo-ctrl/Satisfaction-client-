// src/client/utils/drilldown.ts
// ============================================================================
// DRILL-DOWN (2026-09-27) : construire les URLs `/avis?…` vers lesquelles
// les ventilations (dashboard, synthèse) renvoient.
//
// Contrat avec `/avis` (AvisPage) : `?agence=&guichet=&service=&score=
// &theme=&debut=AAAA-MM-JJ&fin=AAAA-MM-JJ`. Les valeurs sont validées côté
// réception ; ici on ne fait que formater. Le serveur applique son RLS :
// un lien forgé donne une liste vide, jamais un autre périmètre.
// ============================================================================
/** AAAA-MM-JJ ou '' si la valeur n'est pas une date valide. */
export function formaterDateUrl(v) {
    const d = new Date(String(v ?? ''));
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
/**
 * Construit `/avis?…` avec les filtres non vides + la période optionnelle.
 * `base` vaut `routes.AvisRoute.to` ("/avis") en production, injectable en test.
 */
export function construireUrlAvis(filtres, periode, base = '/avis') {
    const q = [];
    const entier = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? String(v) : '';
    const agence = entier(filtres.agence);
    const guichet = entier(filtres.guichet);
    const service = entier(filtres.service);
    if (agence)
        q.push(`agence=${agence}`);
    if (guichet)
        q.push(`guichet=${guichet}`);
    if (service)
        q.push(`service=${service}`);
    if (typeof filtres.score === 'number' && filtres.score >= 1 && filtres.score <= 5) {
        q.push(`score=${filtres.score}`);
    }
    const theme = (filtres.theme || '').trim().slice(0, 60);
    if (theme)
        q.push(`theme=${encodeURIComponent(theme)}`);
    const debut = formaterDateUrl(periode?.debut);
    const fin = formaterDateUrl(periode?.fin);
    if (debut)
        q.push(`debut=${debut}`);
    if (fin)
        q.push(`fin=${fin}`);
    return q.length > 0 ? `${base}?${q.join('&')}` : base;
}
