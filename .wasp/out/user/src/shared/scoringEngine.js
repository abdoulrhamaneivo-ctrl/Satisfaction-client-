// src/shared/scoringEngine.ts
// ============================================================================
// MOTEUR DE SCORING DÉTERMINISTE — vague 1, Phase C.
//
// Pur et testable : zéro Prisma, zéro I/O, zéro LLM. Le serveur (Phase D)
// l'appelle avec des OptionCritere lus en base ; le client ne l'utilise que
// pour l'affichage (jamais pour décider d'une note officielle).
//
// INVARIANTS VERROUILLÉS (règles d'application, voir tests) :
//  1. INDEX D'AFFICHAGE = UX uniquement — jamais utilisé pour scorer.
//     Entrées = optionId (identité stable), JAMAIS index/position/score client.
//  2. OPTION ID = identité de la réponse (QCM = 1 id, CASES = N ids).
//  3. SCORE OFFICIEL = calcul déterministe serveur (ce module).
//  4. IA = interprète et contextualise — ne modifie JAMAIS le score.
//  5. Ambiguïté → statut AMBIGU (jamais de faux score inventé).
//  6. Non notable (TEXTE, CASES catégoriel) → NULL, jamais de 3 fantôme.
//  7. Échelle canonique : score_normalise TOUJOURS /100.
//
// Couches (ne jamais mélanger) :
//   score_officiel (brut métier) → score_normalise (/100) → agrégats
//   (ScoreEngine) → IA (Insight/Global) → indicateurs → conclusions.
// ============================================================================
// Convention « exclusif » (ex. « Aucun problème ») : code_metier EXCLUSIF,
// ou libellé normalisé appartenant à cette liste (comparaison exacte,
// jamais par sous-chaîne — voir tests anti-faux-positifs).
const LIBELLES_EXCLUSIFS = new Set([
    'aucun',
    'aucune',
    'aucun probleme',
    'aucune probleme',
    'aucun souci',
    'aucune gene',
    'rien',
    'ras',
    'rien a signaler',
    'tout va bien',
]);
function estExclusif(o, normaliser) {
    if ((o.code_metier || '').trim().toUpperCase() === 'EXCLUSIF')
        return true;
    return LIBELLES_EXCLUSIFS.has(normaliser(o.libelle));
}
/** 1..5 → /100. */
export function note5Vers100(score) {
    return ((score - 1) / 4) * 100;
}
/** Valeur d'échelle [min,max] → /100 (avec orientation). */
export function echelleVers100(valeur, min, max, orientation = 'HIGHER_BETTER') {
    const ratio = (valeur - min) / (max - min);
    const direct = ratio * 100;
    return orientation === 'LOWER_BETTER' ? 100 - direct : direct;
}
/**
 * Normalisation d'un score ordinal sur une échelle arbitraire.
 * Convention : S = max(5, plus grand score des options scorables) — les
 * échelles 1..5 historiques gardent leur mapping exact ; les échelles
 * 1..7 / 1..10 se normalisent sur leur pleine étendue. Échelle dégénérée
 * (une seule valeur distincte) → 50 neutre documenté.
 */
export function ordinalVers100(score, scoresOptions) {
    const plafond = Math.max(5, ...scoresOptions);
    if (plafond <= 1)
        return 50;
    return ((score - 1) / (plafond - 1)) * 100;
}
function orientationDe(c) {
    return c.orientation === 'LOWER_BETTER' ? 'LOWER_BETTER' : 'HIGHER_BETTER';
}
function optionActiveParId(c, optionId) {
    const toutes = c.options.filter((o) => o.id === optionId);
    if (toutes.length === 0)
        return {};
    const active = toutes.find((o) => o.actif);
    if (!active)
        return { inactive: true };
    return { option: active };
}
function nonNotable(raison) {
    return {
        statut: 'NON_NOTABLE',
        score_officiel: null,
        score_normalise: null,
        source: null,
        options_retenues: [],
        raison,
    };
}
function ambigu(raison) {
    return {
        statut: 'AMBIGU',
        score_officiel: null,
        score_normalise: null,
        source: null,
        options_retenues: [],
        raison,
    };
}
// ── ORDINAL / SMILEY (choix unique parmi options scorées) ─────────────────
/**
 * Résout un choix unique (QCM ordinal, SMILEY) par optionId.
 * - option inconnue → AMBIGU (OPTION_INCONNUE), jamais deviné ;
 * - option inactive (retirée après collecte) → AMBIGU (OPTION_INACTIVE) ;
 * - option non scorable → NON_NOTABLE (choix catégoriel assumé par l'admin).
 */
export function resoudreChoixUnique(critere, optionId, provenance = 'INFERRED') {
    const { option, inactive } = optionActiveParId(critere, optionId);
    if (inactive)
        return ambigu('OPTION_INACTIVE');
    if (!option)
        return ambigu('OPTION_INCONNUE');
    if (!option.est_scorable || option.score == null) {
        return {
            ...nonNotable('OPTION_NON_SCORABLE'),
            options_retenues: [option.id],
        };
    }
    const echelle = critere.options
        .filter((o) => o.actif && o.est_scorable && o.score != null)
        .map((o) => o.score);
    return {
        statut: 'OK',
        score_officiel: option.score,
        score_normalise: ordinalVers100(option.score, echelle),
        source: provenance === 'EXPLICIT' ? 'EXPLICIT' : 'INFERRED',
        options_retenues: [option.id],
    };
}
// ── BINARY (Oui/Non + orientation du critère) ─────────────────────────────
/**
 * Oui/Non : l'orientation appartient AU CRITÈRE, pas au texte.
 * « Satisfait ? » Oui=positif ; « Problème rencontré ? » Oui=négatif.
 */
export function resoudreBinaire(critere, valeurOui) {
    const orientation = orientationDe(critere);
    const positif = orientation === 'HIGHER_BETTER' ? valeurOui : !valeurOui;
    return {
        statut: 'OK',
        score_officiel: positif ? 5 : 1,
        score_normalise: positif ? 100 : 0,
        source: 'EXPLICIT',
        options_retenues: [],
    };
}
// ── NUMERIC / ECHELLE ─────────────────────────────────────────────────────
export function resoudreNumerique(critere, valeur) {
    const min = Number(critere.echelle_min);
    const max = Number(critere.echelle_max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) {
        return ambigu('ECHELLE_MAL_CONFIGUREE');
    }
    if (!Number.isInteger(valeur))
        return ambigu('VALEUR_NON_ENTIERE');
    if (valeur < min || valeur > max)
        return ambigu('ECHELLE_HORS_BORNES');
    const orientation = orientationDe(critere);
    return {
        statut: 'OK',
        score_officiel: valeur,
        score_normalise: echelleVers100(valeur, min, max, orientation),
        source: 'EXPLICIT',
        options_retenues: [],
    };
}
// ── CES (Customer Effort Score) ────────────────────────────────────────────
/**
 * CES : effort perçu, 1 = TRÈS FACILE … max = TRÈS DIFFICILE.
 * L'orientation est IMPOSÉE (LOWER_BETTER) : elle découle de la convention
 * de mesure, jamais d'une saisie admin — un « 1 » est toujours la meilleure
 * expérience, quoi que dise `critere.orientation`.
 * Échelles acceptées : 1-5 et 1-7 uniquement (voir shared/ces.ts).
 * Toute autre configuration → AMBIGU (configuration à corriger, pas d'estimation).
 */
export function resoudreCES(critere, valeur) {
    const min = Number(critere.echelle_min);
    const max = Number(critere.echelle_max);
    if (min !== 1 || !(max === 5 || max === 7))
        return ambigu('ECHELLE_CES_INVALIDE');
    if (!Number.isInteger(valeur))
        return ambigu('VALEUR_NON_ENTIERE');
    if (valeur < 1 || valeur > max)
        return ambigu('ECHELLE_HORS_BORNES');
    return {
        statut: 'OK',
        score_officiel: valeur,
        score_normalise: echelleVers100(valeur, 1, max, 'LOWER_BETTER'),
        source: 'EXPLICIT',
        options_retenues: [],
    };
}
// ── NPS (0-10 natif) ──────────────────────────────────────────────────────
export function categorieNPS(valeur) {
    if (valeur <= 6)
        return 'DETRACTEUR';
    if (valeur <= 8)
        return 'PASSIF';
    return 'PROMOTEUR';
}
export function resoudreNPS(valeur) {
    if (!Number.isInteger(valeur) || valeur < 0 || valeur > 10) {
        return ambigu('NPS_HORS_BORNES');
    }
    return {
        statut: 'OK',
        score_officiel: valeur,
        score_normalise: valeur * 10,
        source: 'EXPLICIT',
        categorie_nps: categorieNPS(valeur),
        options_retenues: [],
    };
}
/** Agrégation NPS — jamais une moyenne de notes. */
export function agregerNPS(valeurs) {
    const volume = valeurs.length;
    if (volume === 0) {
        return {
            volume: 0, promoteurs: 0, passifs: 0, detracteurs: 0,
            taux_promoteurs: 0, taux_passifs: 0, taux_detracteurs: 0, nps: null,
        };
    }
    let promoteurs = 0;
    let passifs = 0;
    let detracteurs = 0;
    for (const v of valeurs) {
        const c = categorieNPS(v);
        if (c === 'PROMOTEUR')
            promoteurs += 1;
        else if (c === 'PASSIF')
            passifs += 1;
        else
            detracteurs += 1;
    }
    const taux_promoteurs = (promoteurs / volume) * 100;
    const taux_detracteurs = (detracteurs / volume) * 100;
    return {
        volume,
        promoteurs,
        passifs,
        detracteurs,
        taux_promoteurs,
        taux_passifs: (passifs / volume) * 100,
        taux_detracteurs,
        nps: Math.round(taux_promoteurs - taux_detracteurs),
    };
}
// ── CASES / CHOIX MULTIPLES ───────────────────────────────────────────────
/**
 * Résout une sélection multiple par ids d'options.
 * - CATEGORICAL (ou sans scores/poids) → NON_NOTABLE + ids (stats %).
 * - WEIGHTED → base 100 + Σ(poids), clampé 0-100 ; officiel = /20 arrondi.
 * - Exclusif (« Aucun ») + autres choix → AMBIGU (EXCLUSIVITE_VIOLÉE).
 * - Sélection vide → AMBIGU (SELECTION_VIDE : rien à scorer, pas un 0).
 * - Option inconnue/inactive → AMBIGU (jamais ignorée silencieusement :
 *   ignorer un choix fausserait la moyenne ou la distribution).
 */
export function resoudreCases(critere, optionIds, provenance = 'INFERRED', normaliser = (s) => s.toLowerCase().trim()) {
    const uniques = [...new Set(optionIds)];
    if (uniques.length === 0)
        return ambigu('SELECTION_VIDE');
    const retenues = [];
    for (const id of uniques) {
        const { option, inactive } = optionActiveParId(critere, id);
        if (inactive)
            return ambigu('OPTION_INACTIVE');
        if (!option)
            return ambigu('OPTION_INCONNUE');
        retenues.push(option);
    }
    const exclusives = retenues.filter((o) => estExclusif(o, normaliser));
    if (exclusives.length > 0 && retenues.length > 1) {
        return ambigu('EXCLUSIVITE_VIOLEE');
    }
    const mode = (critere.scoring_mode || '').toUpperCase();
    if (mode === 'CASES_WEIGHTED') {
        const poids = retenues.map((o) => o.poids);
        if (poids.some((p) => p == null))
            return ambigu('POIDS_MANQUANTS');
        const total = 100 + poids.reduce((s, p) => s + p, 0);
        const normalise = Math.max(0, Math.min(100, total));
        return {
            statut: 'OK',
            score_officiel: Math.max(1, Math.min(5, Math.round(normalise / 20))),
            score_normalise: normalise,
            source: 'EXPLICIT',
            options_retenues: retenues.map((o) => o.id),
        };
    }
    // CATEGORICAL explicite, ou CASES legacy sans scores : jamais noté.
    // (Compat : si des scores existent SANS mode explicite, la moyenne
    // historique reste disponible via resoudreCasesMoyenne — Phase D.)
    return {
        ...nonNotable(mode === 'CASES_CATEGORICAL' ? 'CASES_CATEGORIEL' : 'CASES_NON_VALENCE'),
        options_retenues: retenues.map((o) => o.id),
    };
}
/**
 * Compat historique : moyenne arrondie des options scorées cochées.
 * Réservé aux CASES legacy SANS scoring_mode explicite (Phase D).
 * Ne pas utiliser pour les nouveaux questionnaires.
 */
export function resoudreCasesMoyenne(critere, optionIds, provenance = 'INFERRED') {
    const base = resoudreCases({ ...critere, scoring_mode: 'CASES_CATEGORICAL' }, optionIds, provenance);
    if (base.statut === 'AMBIGU')
        return base;
    const ids = new Set(base.options_retenues);
    const scores = critere.options
        .filter((o) => ids.has(o.id) && o.actif && o.est_scorable && o.score != null)
        .map((o) => o.score);
    if (scores.length === 0)
        return base;
    const moyenne = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);
    const echelle = critere.options
        .filter((o) => o.actif && o.est_scorable && o.score != null)
        .map((o) => o.score);
    return {
        statut: 'OK',
        score_officiel: moyenne,
        score_normalise: ordinalVers100(moyenne, echelle),
        source: provenance === 'EXPLICIT' ? 'EXPLICIT' : 'INFERRED',
        options_retenues: base.options_retenues,
    };
}
// ── TEXTE LIBRE ───────────────────────────────────────────────────────────
/** Un texte libre ne devient JAMAIS une note officielle (décision validée). */
export function resoudreTexte() {
    return nonNotable('TEXTE_LIBRE');
}
/**
 * Point d'entrée unique : mode explicite > déduit du type_reponse.
 * Modes inconnus → AMBIGU (MODE_INCONNU), jamais de fallback silencieux.
 */
export function resoudreReponse(critere, entree, provenance = 'INFERRED') {
    const mode = (critere.scoring_mode || '').toUpperCase();
    const type = (critere.type_reponse || '').toUpperCase();
    const effectif = mode ||
        (type === 'QCM'
            ? 'ORDINAL'
            : type === 'OUI_NON'
                ? 'BINARY'
                : type === 'ECHELLE'
                    ? 'NUMERIC'
                    : type === 'CES'
                        ? 'CES'
                        : type === 'SMILEY'
                            ? 'SMILEY'
                            : type === 'NPS'
                                ? 'NPS'
                                : type === 'TEXTE'
                                    ? 'FREE_TEXT'
                                    : type === 'CASES'
                                        ? 'CASES_CATEGORICAL'
                                        : '');
    switch (effectif) {
        case 'ORDINAL':
        case 'SMILEY':
            if (entree.type !== 'option')
                return ambigu('ENTREE_INCOMPATIBLE');
            return resoudreChoixUnique(critere, entree.optionId, provenance);
        case 'BINARY':
            if (entree.type !== 'binaire')
                return ambigu('ENTREE_INCOMPATIBLE');
            return resoudreBinaire(critere, entree.valeurOui);
        case 'NUMERIC':
            if (entree.type !== 'valeur')
                return ambigu('ENTREE_INCOMPATIBLE');
            return resoudreNumerique(critere, entree.valeur);
        case 'CES':
            if (entree.type !== 'valeur')
                return ambigu('ENTREE_INCOMPATIBLE');
            return resoudreCES(critere, entree.valeur);
        case 'NPS':
            if (entree.type !== 'valeur')
                return ambigu('ENTREE_INCOMPATIBLE');
            return resoudreNPS(entree.valeur);
        case 'CASES_CATEGORICAL':
        case 'CASES_WEIGHTED':
            if (entree.type !== 'options')
                return ambigu('ENTREE_INCOMPATIBLE');
            return resoudreCases(critere, entree.optionIds, provenance);
        case 'FREE_TEXT':
            return resoudreTexte();
        default:
            return ambigu('MODE_INCONNU');
    }
}
