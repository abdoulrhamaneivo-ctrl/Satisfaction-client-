// src/shared/libelleReponse.ts
// ============================================================================
// RESTITUTION EN CLAIR D'UNE RÉPONSE — vague 1, Vague 2 (nettoyage §13).
//
// PROBLÈME CORRIGÉ : trois affichages reconstruisaient le libellé d'un choix
// QCM depuis la POSITION du score (`options[score_brut - 1]`). Or le score est
// une valeur SÉMANTIQUE, pas un rang : pour un critère saisi
// `Très satisfait,Neutre,Très insatisfait` avec `scores_reponse = 5,3,1`, un
// score de 2 affichait « Neutre » au lieu de « Très insatisfait ».
//
// RÈGE : un libellé d'option se résout UNIQUEMENT par son identité
// (`ReponseOption.id_option` → `OptionCritere.libelle`). Aucune position, aucun
// `index`, aucun score ne sert de clé de lecture. Si l'identité est absente
// (ligne antérieure à la migration), on ne devine rien : on renvoie `null` et
// l'appelant affiche un tiret.
//
// Ce module est PUR : ni Prisma, ni React, ni I/O. Il est importé par le
// serveur (exports CSV/XLSX) ET par le client (fiche d'un avis, palette de
// recherche) pour qu'une même réponse s'affiche partout de la même façon.
// ============================================================================
import { LIBELLES_ECHELLE_CES } from './ces';
/** Libellés des options choisies, dans l'ordre de la jointure. */
export function libellesOptionsChoisis(r) {
    return (r.optionsChoisies ?? [])
        .map((co) => String(co?.option?.libelle ?? '').trim())
        .filter(Boolean);
}
/** Note métier : `score_officiel` s'il existe, sinon l'ancien `score_brut`. */
function noteMetier(r) {
    const officiel = Number(r.score_officiel);
    if (Number.isFinite(officiel))
        return officiel;
    const brut = Number(r.score_brut);
    return Number.isFinite(brut) ? brut : null;
}
/** Bornes d'une échelle stockée dans `options_reponse` (`"1,10"`). */
export function borneEchelle(critere) {
    const [a, b] = String(critere?.options_reponse || '').split(',').map((v) => Number(String(v).trim()));
    if (!Number.isFinite(a) || !Number.isFinite(b) || !(b > a))
        return null;
    return { min: a, max: b };
}
function estCES(critere) {
    return String(critere?.scoring_mode || '').toUpperCase() === 'CES';
}
/**
 * Oui/Non : le 5 et le 1 stockés sont un ENCODAGE de polarité, pas une note.
 * L'orientation du critère décide donc du sens — c'est ce qui affichait
 * « Non » pour un « Oui » sur une question du type « Avez-vous rencontré un
 * problème ? » (orientation LOWER_BETTER).
 */
export function libelleOuiNon(r) {
    const s = noteMetier(r);
    if (s !== 1 && s !== 5)
        return null;
    const lower = String(r.critere?.orientation || 'HIGHER_BETTER').toUpperCase() === 'LOWER_BETTER';
    return (lower ? s === 1 : s === 5) ? 'Oui' : 'Non';
}
/**
 * Polarité de l'expérience, pour l'icône (pas pour le texte affiché).
 * Le résolveur stocke déjà la positivité : `positif → 5`, `négatif → 1`
 * (`scoringEngine.ts:218-223`), quelle que soit l'orientation. L'orientation ne
 * sert qu'à retrouver la RÉPONSE (« Oui » / « Non »), pas la polarité.
 */
export function reponseEstPositive(r) {
    const s = noteMetier(r);
    if (s !== 1 && s !== 5)
        return null;
    return s === 5;
}
/** Valeur d'échelle rendue en clair : `7/7 · Très difficile` pour un CES. */
export function libelleEchelle(r) {
    const v = noteMetier(r);
    if (v === null)
        return null;
    const type = String(r.critere?.type_reponse || '').toUpperCase();
    if (type === 'NPS')
        return `${v}/10`;
    const bornes = borneEchelle(r.critere);
    if (!bornes)
        return String(v);
    if (estCES(r.critere)) {
        const labels = LIBELLES_ECHELLE_CES[bornes.max];
        const libelle = labels?.[v - 1];
        return libelle ? `${v}/${bornes.max} · ${libelle}` : `${v}/${bornes.max}`;
    }
    return `${v}/${bornes.max}`;
}
/**
 * Réponse en clair, sans le libellé du critère (les appelants le préfixent).
 * `null` = rien de restituable → l'appelant affiche « — » plutôt qu'inventer.
 */
export function reponseEnClair(r, options) {
    const type = String(r.critere?.type_reponse || '').toUpperCase();
    const texte = String(r.commentaire_texte || '').trim();
    const specifique = texte && texte !== String(options?.texteGroupe || '').trim() ? texte : null;
    if (type === 'TEXTE')
        return specifique || texte || null;
    if (type === 'CASES') {
        const choisis = libellesOptionsChoisis(r);
        if (choisis.length > 0)
            return choisis.join(' • ');
        // Repli legacy : le libellé des choix est stocké dans le commentaire,
        // séparé par « • ». Jamais une reconstruction par score.
        return specifique || (texte ? texte.split('•').map((s) => s.trim()).filter(Boolean).join(' • ') : null);
    }
    if (type === 'QCM') {
        // Identité uniquement. Aucun repli positionnel.
        return libellesOptionsChoisis(r)[0] ?? specifique ?? null;
    }
    if (type === 'OUI_NON')
        return libelleOuiNon(r);
    if (type === 'ECHELLE' || type === 'NPS' || type === 'CES')
        return libelleEchelle(r);
    const v = noteMetier(r);
    return v !== null && v >= 1 && v <= 5 ? `${v}/5` : (v !== null ? String(v) : null);
}
/** Rendu complet « Critère : valeur », prêt pour un export ou une liste. */
export function decrireReponse(r, options) {
    const libelleCritere = r.critere?.libelle_critere || 'Critère';
    const valeur = reponseEnClair(r, options);
    const avecPrefixe = options?.prefixeCritere !== false;
    return avecPrefixe ? `${libelleCritere}: ${valeur ?? '—'}` : (valeur ?? '—');
}
//# sourceMappingURL=libelleReponse.js.map