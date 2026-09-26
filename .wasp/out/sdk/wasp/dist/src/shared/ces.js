// src/shared/ces.ts
// ============================================================================
// CES — CUSTOMER EFFORT SCORE (effort perçu), vague 1, Phase L.
// Pur et testable : zéro Prisma, zéro I/O, zéro LLM.
//
// CONVENTION Yeba (verrouillée) : l'effort est noté 1 = TRÈS FACILE …
// max = TRÈS DIFFICILE, donc UN SCORE BAS = BONNE EXPÉRIENCE. C'est
// l'inverse du CSAT : d'où `orientation = LOWER_BETTER` imposée par le
// moteur (jamais laissée au hasard de la saisie admin).
//
// Le score canonique `score_normalise` reste /100 « qualité perçue » comme
// tous les autres indicateurs : effort 1 → 100, effort max → 0.
//
// AUCUN benchmark externe n'est embarqué : les seuils ci-dessous sont des
// conventions de mesure (bandes), pas des références de marché. Comparer
// Yeba à une industry exigerait une source datée et validée — hors périmètre.
//
// Échelles supportées : 1-5 (5 niveaux) et 1-7 (version fine, la plus
// utilisée enRelationship Management). Toute autre échelle → configuration
// invalide, jamais un calcul approché.
// ============================================================================
/** Échelles valides (borne min toujours 1). */
export const ECHELLES_CES = [5, 7];
/**
 * Bandes d'effort — découpage ARBITRAIRE MAIS FIGÉ (convention de mesure) :
 * - 1-5 : 1-2 faible, 3 moyen, 4-5 élevé ;
 * - 1-7 : 1-3 faible, 4-5 moyen, 6-7 élevé.
 * Les effectifs de chaque bande sont toujours rapportés au volume total
 * (dénominateur = n(CES), jamais n(global)).
 */
export const BANDES_CES = {
    5: [
        { id: 'FAIBLE_EFFORT', label: 'Faible effort (très facile)', min: 1, max: 2 },
        { id: 'EFFORT_MOYEN', label: 'Effort moyen', min: 3, max: 3 },
        { id: 'EFFORT_ELEVE', label: 'Effort élevé (très difficile)', min: 4, max: 5 },
    ],
    7: [
        { id: 'FAIBLE_EFFORT', label: 'Faible effort (très facile)', min: 1, max: 3 },
        { id: 'EFFORT_MOYEN', label: 'Effort moyen', min: 4, max: 5 },
        { id: 'EFFORT_ELEVE', label: 'Effort élevé (très difficile)', min: 6, max: 7 },
    ],
};
/** Libellés de bandes par défaut pour un libellé d'échelle. */
export const LIBELLES_ECHELLE_CES = {
    5: ['Très facile', 'Plutôt facile', 'Ni facile ni difficile', 'Plutôt difficile', 'Très difficile'],
    7: [
        'Très facile',
        'Très facile',
        'Plutôt facile',
        'Plutôt facile',
        'Ni facile ni difficile',
        'Plutôt difficile',
        'Très difficile',
    ],
};
export function estEchelleCES(v) {
    return v === 5 || v === 7;
}
/** Bande d'une note d'effort brute. Hors bornes → null (jamais de bande inventée). */
export function bandeCES(note, echelle) {
    if (!Number.isInteger(note))
        return null;
    const b = BANDES_CES[echelle].find((x) => note >= x.min && note <= x.max);
    return b ? b.id : null;
}
/**
 * Top box « faible effort » = meilleur tiers bas de l'échelle :
 * 1-2 sur 5, 1-3 sur 7. Hors bornes → false (une note invalide ne fait
 * jamais monter le taux).
 */
export function topBoxCES(note, echelle) {
    return bandeCES(note, echelle) === 'FAIBLE_EFFORT';
}
/**
 * Note d'effort → score canonique /100 « qualité perçue » (effort bas = 100).
 * Fonction de ST_RANK (identique à `echelleVers100(..., LOWER_BETTER)`)
 * mais bornée aux seuls CES : aucun administrateur ne peut inverser le sens.
 */
export function scoreEffort100(note, echelle) {
    if (!Number.isInteger(note) || note < 1 || note > echelle)
        return null;
    return ((echelle - note) / (echelle - 1)) * 100;
}
/** Volume vide → agrégats à zéro + métriques à null (jamais 0 %). */
export function agregerCES(notes, echelle) {
    const repartition = {};
    for (let n = 1; n <= echelle; n += 1)
        repartition[String(n)] = 0;
    let faible = 0;
    let moyen = 0;
    let eleve = 0;
    let somme = 0;
    for (const note of notes) {
        if (!Number.isInteger(note) || note < 1 || note > echelle)
            continue; // ignorée, pas comptée
        repartition[String(note)] += 1;
        somme += note;
        const b = bandeCES(note, echelle);
        if (b === 'FAIBLE_EFFORT')
            faible += 1;
        else if (b === 'EFFORT_MOYEN')
            moyen += 1;
        else
            eleve += 1;
    }
    const volume = faible + moyen + eleve;
    if (volume === 0) {
        return {
            volume: 0,
            echelle,
            faible_effort: 0,
            effort_moyen: 0,
            effort_eleve: 0,
            taux_faible_effort: 0,
            taux_effort_moyen: 0,
            taux_effort_eleve: 0,
            top_box: 0,
            score_qualite_100: null,
            note_effort_moyenne: null,
            repartition,
        };
    }
    return {
        volume,
        echelle,
        faible_effort: faible,
        effort_moyen: moyen,
        effort_eleve: eleve,
        taux_faible_effort: (faible / volume) * 100,
        taux_effort_moyen: (moyen / volume) * 100,
        taux_effort_eleve: (eleve / volume) * 100,
        top_box: (faible / volume) * 100,
        score_qualite_100: scoreEffort100(
        // La moyenne de la qualité = qualité de la moyenne d'effort (linéaire).
        Math.round(somme / volume), echelle),
        note_effort_moyenne: Math.round((somme / volume) * 100) / 100,
        repartition,
    };
}
/**
 * Détecte un critère CES et son échelle à partir de la configuration stockée
 * (min/max de l'échelle). Renvoie null si le critère n'est pas un CES ou si
 * l'échelle n'est pas supportée — l'appelant décide alors d'ignorer la ligne
 * (jamais d'estimation).
 */
export function reconnaitreCES(c) {
    const mode = String(c.scoring_mode || '').toUpperCase();
    const type = String(c.type_reponse || '').toUpperCase();
    if (mode !== 'CES' && !(mode === '' && type === 'CES'))
        return null;
    const min = Number(c.echelle_min);
    const max = Number(c.echelle_max);
    if (min !== 1 || !estEchelleCES(max))
        return null;
    return max;
}
//# sourceMappingURL=ces.js.map