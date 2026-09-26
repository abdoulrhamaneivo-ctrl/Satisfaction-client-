// src/shared/scoringQCM.ts
// ============================================================================
// SCORING QCM / CASES « ADMIN-PROOF »
//
// Problème résolu : le score d'une option QCM était `index + 1` (positionnel).
// Si l'admin saisit les options dans l'ordre inverse (« Très satisfait » en
// premier), « Très insatisfait » (dernier) valait 5 au lieu de 1.
//
// Principe : le score ne dépend JAMAIS de la position de l'option.
// 1 = pire, N = meilleur (N = 5 max, échelle Yeba), QUEL QUE SOIT l'ordre
// saisi par l'admin. Deux couches de défense :
//
//  1. STOCKAGE EXPLICITE — `Critere.scores_reponse` : mapping parallèle à
//     `options_reponse`, même convention CSV.
//     Ex. options « Très satisfait,Neutre,Très insatisfait »
//     → scores « 5,3,1 ».
//     Rempli à la création/édition (createCritere/updateCritere) : soit
//     l'admin (futur UI) fournit des scores explicites, soit le serveur les
//     infère via le lexique FR ci-dessous et les STOCKE. La colonne est donc
//     toujours renseignée pour QCM/CASES valencés.
//
//  2. RÉSOLUTION SERVEUR AU SUBMIT — soumettreAvis IGNORE le score envoyé
//     par le client pour QCM/CASES et recalcule depuis le LIBELLÉ choisi
//     (`item.texte`) + mapping stocké (repli : inférence lexicale). Un client
//     trafiqué ou désynchronisé ne peut pas forger une note.
//
// Module PUR (aucune dépendance Prisma/Node) importable côté serveur ET
// côté client (affichage instantané de la note, récapitulatif).
// ============================================================================
/** Options QCM/CASES : choix séparés par des virgules (convention existante). */
export function parseOptionsCSV(brut) {
    return String(brut || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
}
/** Scores explicites parallèles aux options. null = absents/invalides. */
export function parseScoresCSV(brut) {
    if (!brut || !brut.trim())
        return null;
    const scores = String(brut)
        .split(',')
        .map((s) => Number(s.trim()));
    if (scores.some((s) => !Number.isInteger(s) || s < 1 || s > 5))
        return null;
    return scores;
}
/**
 * Normalisation d'un libellé pour comparaison : minuscules, sans accents,
 * espaces repliés. « Très Satisfait » ≡ « tres satisfait ».
 */
export function normaliserLibelle(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[''ʼ`]/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
// ── Lexique de sentiment FR ────────────────────────────────────────────────
// RÈGLE CRITIQUE : « insatisfait » CONTIENT « satisfait ». Toute entrée
// négative en « insatisf* » doit donc être testée AVANT les entrées
// positives — d'où l'ordre des blocs dans `infererScoreOption`.
// Les listes sont comparées sur libellés normalisés (sans accents).
const NEGATION_FORTE = [
    'insatisf',
    'insatisfaisant',
    'mecontent',
    'pas satisfait',
    'pas content',
    'pas du tout',
    'nul',
    'horrible',
    'affreux',
    'lamentable',
    'deplorable',
    'honteux',
    'catastroph',
    'execrable',
    'desastre',
    'pire',
    'deteste',
    'inacceptable',
    'scandale',
];
const NEGATIF = [
    'non',
    'jamais',
    'mauvais',
    'mauvaise',
    'lent',
    'mediocre',
    'decevant',
    'decu',
    'penible',
    'long',
    'compliqu',
    'difficile',
    'pas',
    'peu',
];
const NEUTRE = [
    'neutre',
    'moyen',
    'moyennement',
    'passable',
    'correct',
    'ni ',
    'bof',
    'partiellement',
    'mitige',
    'normal',
    'pas mal',
];
const POSITIF_FORT = [
    'tres satisfait',
    'tout a fait',
    'entierement',
    'excellent',
    'parfait',
    'impeccable',
    'irreprochable',
    'remarquable',
    'nickel',
    'niquel',
    'top',
    'exceptionnel',
    'formidable',
    'genial',
    'adore',
    'ravi',
    'enchant',
    'super',
    'bravo',
    'felicitation',
];
const POSITIF = [
    'satisfait',
    'satisfaisant',
    'content',
    'bien',
    'bon',
    'bonne',
    'rapide',
    'efficace',
    'aimable',
    'accueillant',
    'propre',
    'claire',
    'clair',
    'oui',
    'plutot oui',
    'assez',
];
// Comparaison sur MOTS ENTIERS (frontières \b), pas en sous-chaîne :
// « Abonnement » ⊃ « bonne » et « Annonce » ⊃ « non » ne doivent pas scorer.
// Seules les RACINES ci-dessous (stems tronqués) matchent en préfixe.
const RACINES_SANS_FRONTIERE_FINALE = new Set(['insatisf', 'catastroph', 'compliqu', 'enchant']);
const echapperRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cacheMotifs = new Map();
function motifEntree(entree) {
    const cle = entree.trim();
    let m = cacheMotifs.get(cle);
    if (!m) {
        const corps = echapperRegex(cle).replace(/\s+/g, '\\s+');
        m = new RegExp(`\\b${corps}${RACINES_SANS_FRONTIERE_FINALE.has(cle) ? '' : '\\b'}`);
        cacheMotifs.set(cle, m);
    }
    return m;
}
const contientUn = (texte, entrees) => entrees.find((e) => motifEntree(e).test(texte)) ?? null;
/**
 * Infère le score sémantique (1 = pire … 5 = meilleur) d'UN libellé d'option.
 * Retourne null si le libellé ne porte aucune valence identifiable
 * (ex. CASES « motifs » : « Accueil,Guichet 3 » → non scorable).
 */
export function infererScoreOption(option) {
    const t = normaliserLibelle(option);
    if (!t)
        return null;
    // 0. Construction neutre « ni … ni … » — gagne sur tout le reste.
    if (/\bni\b/.test(t))
        return 3;
    // 0bis-avant. Négation forte INTENSIFIÉE (« pas du tout satisfait »,
    // « vraiment nul ») : vaut 1, avant la règle 0bis qui vaut 2 par défaut.
    // Sans ça, le préfixe « pas » capterait ces cas en premier.
    if (/\b(tres|tout a fait|vraiment|completement|totalement|du tout)\b/.test(t) &&
        contientUn(t, NEGATION_FORTE)) {
        return 1;
    }
    // 0bis. Négation préfixe d'un positif (« non satisfait », « pas clair »,
    // « jamais à l'heure ») : le positif seul vaudrait 4-5, nié il vaut 2.
    if (/^(non|pas|jamais|peu|sans)\b/.test(t) && contientUn(t, [...POSITIF_FORT, ...POSITIF])) {
        return 2;
    }
    // 1. Négations fortes — AVANT tout (cf. « insatisfait » ⊃ « satisfait »).
    const fort = contientUn(t, NEGATION_FORTE);
    if (fort) {
        // « très insatisfait / tout à fait nul » → 1, sinon 2.
        if (/\b(tres|tout a fait|vraiment|completement|totalement)\b/.test(t))
            return 1;
        return t === 'non' ? 1 : 2;
    }
    // 2. Binaire Oui/Non (cohérent avec OUI_NON : Oui = 5, Non = 1).
    if (t === 'oui')
        return 5;
    if (t === 'non')
        return 1;
    // 3. Positifs forts → 5.
    if (contientUn(t, POSITIF_FORT))
        return 5;
    // 4. Neutres → 3 (avant POSITIF : « assez bien » reste 4 via POSITIF,
    //    mais « moyen » ne doit pas matcher « bon » — aucun chevauchement).
    if (contientUn(t, NEUTRE)) {
        // « plutôt moyen / très moyen » → 3 quand même (pas de sur-pondération).
        return 3;
    }
    // 5. Positifs simples → 4 (« plutôt »/« assez » restent 4, pas 5).
    if (contientUn(t, POSITIF))
        return 4;
    // 6. Négatifs résiduels → 2 (« pas », « peu », « lent »…).
    if (contientUn(t, NEGATIF))
        return 2;
    return null;
}
/** Infère le score de chaque option. null = valence inconnue. */
export function infererScoresOptions(options) {
    return options.map(infererScoreOption);
}
/**
 * Scores effectifs d'un critère QCM/CASES, dans l'ordre des options.
 * Priorité : scores stockés (`scores_reponse`, validés : même cardinalité
 * que les options, entiers 1-5) PUIS inférence lexicale.
 * Retourne null si une option au moins n'est pas scorable — le critère
 * reste alors NON NOTÉ (comportement historique : exclu des moyennes).
 */
export function scoresEffectifsPourCritere(critere) {
    const options = parseOptionsCSV(critere?.options_reponse);
    if (options.length === 0)
        return null;
    const stockes = parseScoresCSV(critere?.scores_reponse);
    if (stockes && stockes.length === options.length)
        return stockes;
    const inferes = infererScoresOptions(options);
    if (inferes.some((s) => s === null))
        return null;
    return inferes;
}
// ── Résolution au submit (serveur = autorité) ──────────────────────────────
/** Index d'une option par libellé : exact normalisé, puis inclusion. */
function indexOptionParLabel(options, label) {
    const cherche = normaliserLibelle(label);
    if (!cherche)
        return -1;
    const normees = options.map(normaliserLibelle);
    let i = normees.findIndex((o) => o === cherche);
    if (i >= 0)
        return i;
    i = normees.findIndex((o) => o.length > 0 && (o.includes(cherche) || cherche.includes(o)));
    return i;
}
// ── Validation des scores explicites (create/updateCritere) ───────────────
/**
 * Valide des scores explicites fournis avec les options.
 * Retourne la forme CSV normalisée (« 5,3,1 »). Lance Error sinon.
 */
export function validerScoresExplicites(optionsBrut, scoresBrut) {
    const options = parseOptionsCSV(optionsBrut);
    const scores = parseScoresCSV(scoresBrut);
    if (!scores) {
        throw new Error('Scores invalides : fournissez autant d’entiers (1 à 5) que de choix, séparés par des virgules (ex. « 5,3,1 »).');
    }
    if (scores.length !== options.length) {
        throw new Error(`Scores invalides : ${scores.length} score(s) pour ${options.length} choix — il en faut exactement un par choix.`);
    }
    return scores.join(',');
}
/**
 * Construit la valeur à STOCKER dans `scores_reponse` à la création/édition :
 * scores explicites validés s'ils sont fournis, sinon inférence lexicale.
 * Retourne null si le critère n'est pas scorable (stockage null = exclu).
 */
export function construireScoresAStocker(optionsBrut, scoresBrut) {
    const options = parseOptionsCSV(optionsBrut);
    if (options.length === 0)
        return null;
    if (scoresBrut && scoresBrut.trim())
        return validerScoresExplicites(optionsBrut, scoresBrut);
    const inferes = infererScoresOptions(options);
    if (inferes.some((s) => s === null))
        return null;
    return inferes.join(',');
}
//# sourceMappingURL=scoringQCM.js.map