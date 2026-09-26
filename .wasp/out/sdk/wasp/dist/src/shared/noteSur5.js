// src/shared/noteSur5.ts
// ============================================================================
// RÈGLE UNIQUE DE LA NOTE DE SATISFACTION SUR 5 (Vague 1, P2).
//
// L'audit a établi que la même normalisation existait en CINQ versions
// divergentes, dont deux sans branche `score_normalise`, et que huit
// agrégats sur dix l'ignoraient purement parce que leur `select` ne demandait
// pas le champ. Résultat : le CES était inversé (un « très difficile » 7/7
// devenait 5/5 étoiles) et un NPS 3/10 entrait dans un histogramme de
// satisfaction.
//
// DÉCISION DE CONSTRUCTION (à connaître avant de réutiliser ce module) :
// la satisfaction moyenne N'inclut QUE les questions de satisfaction —
// SMILEY, QCM noté, OUI/NON, ECHELLE de satisfaction. Deux familles ont un
// indicateur propre et en sont donc EXCLUES :
//   - `type_reponse = NPS` (échelle 0-10 de recommandation) ;
//   - `scoring_mode = CES` (échelle d'effort, sens inversé : 1 = très facile).
// Mélanger un score d'effort et un score de satisfaction dans une même moyenne
// n'a aucun sens — c'est exactement le bug que cette exclusion supprime.
//
// Sources de la valeur, dans cet ordre :
//   1. `score_normalise` (/100, calculé par le moteur) — la seule vérité ;
//   2. à défaut, recalcul depuis `score_brut` (lignes antérieures à la vague
//      de scoring), qui reste un approximation assumée et bornée.
// ============================================================================
/** Ce critère relève-t-il de la satisfaction moyenne ? */
export function estCritereSatisfaction(critere) {
    const type = String(critere?.type_reponse || '').toUpperCase();
    if (type === 'TEXTE' || type === 'QCM' || type === 'CASES')
        return false;
    if (type === 'NPS')
        return false; // métrique dédiée
    if (type === 'CES')
        return false; // (type explicite, par sécurité)
    if (String(critere?.scoring_mode || '').toUpperCase() === 'CES')
        return false;
    if (String(critere?.scoring_mode || '').toUpperCase() === 'FREE_TEXT')
        return false;
    return true;
}
/**
 * Note de satisfaction sur 5, ou `null` si la réponse n'en porte pas
 * (texte, choix catégoriel, NPS, CES, ou configuration illisible).
 * Échelle de sortie bornée à [1, 5] : un 0/100 est une étoile, pas un zéro.
 */
export function noteSur5(r) {
    if (!r)
        return null;
    const critere = r.critere;
    if (!estCritereSatisfaction(critere))
        return null;
    // Attention : `Number(null)` vaut 0 — un score ABSENT ne doit pas être lu
    // comme un 0/100. Le test de type est donc explicite.
    const stocke = typeof r.score_normalise === 'number' ? r.score_normalise : null;
    if (stocke !== null && Number.isFinite(stocke)) {
        return Math.max(1, Math.min(5, stocke / 20));
    }
    const brut = typeof r.score_brut === 'number' ? r.score_brut : null;
    if (brut === null || !Number.isFinite(brut))
        return null;
    const type = String(critere?.type_reponse || '').toUpperCase();
    if (type === 'ECHELLE') {
        const [a, b] = String(critere?.options_reponse || '1,5').split(',');
        const min = Number(a);
        const max = Number(b);
        if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min))
            return null;
        return Math.max(1, Math.min(5, 1 + ((brut - min) / (max - min)) * 4));
    }
    return brut >= 1 && brut <= 5 ? brut : null;
}
/** Notes de satisfaction d'une liste de réponses, dans l'ordre. */
export function notesSur5(reponses) {
    return reponses.map(noteSur5).filter((n) => n !== null);
}
/** Moyenne de satisfaction sur 5, ou `null` si aucune réponse notable. */
export function moyenneSur5(reponses) {
    const notes = notesSur5(reponses);
    if (notes.length === 0)
        return null;
    return notes.reduce((s, n) => s + n, 0) / notes.length;
}
//# sourceMappingURL=noteSur5.js.map