// src/shared/csat.ts
// ============================================================================
// VAGUE 6 — CSAT : une seule règle, une seule implémentation.
//
// Règle (docs/logique-avis-uniques.md, §2) :
//   toutes les lignes `Reponse` qui partagent le même `id_soumission`
//   forment UN SEUL avis.
//
// Conséquences, souvent oubliées dans les implémentations :
//   1. le CSAT se moyenne par AVIS, pas par ligne. Un formulaire à
//      5 questions ne doit pas peser 5× plus qu'un formulaire à 1 question,
//      sous peine de fausser le pilotage — c'est littéralement le bug que
//      ce document a fait corriger ;
//   2. seuls les critères de SATISFACTION entrent dans le calcul. Une
//      recommandation (NPS 0-10) ou un effort perçu (CES, sens inversé)
//      ne sont pas des notes de satisfaction : un « très difficile » 0/100
//      faisait plummir un CSAT de 4,2 à 3,8 avant que ce filtre existe.
//
// Le moteur global (`src/server/gex/moteurGlobal.ts`) appliquait les deux
// règles dans son CSAT global, mais pas dans ses ventilations par agence,
// service et guichet — où le volume comptait même les LIGNES. Ce module
// centralise la règle pour qu'il n'y ait plus de variante.
// ============================================================================
import { noteSur5 } from './noteSur5';
import { estCritereSatisfaction } from './noteSur5';
/** Sépare les lignes orphelines (sans `id_soumission`) : chacune son avis. */
export function grouperParAvis(lignes) {
    const parSoumission = new Map();
    const orphelines = [];
    for (const ligne of lignes) {
        if (ligne.id_soumission) {
            const cle = String(ligne.id_soumission);
            const groupe = parSoumission.get(cle);
            if (groupe)
                groupe.push(ligne);
            else
                parSoumission.set(cle, [ligne]);
        }
        else {
            orphelines.push(ligne);
        }
    }
    return [...parSoumission.values(), ...orphelines.map((l) => [l])];
}
/** Nombre d'avis distincts (soumissions + orphelines). */
export function compterAvisDans(lignes) {
    return grouperParAvis(lignes).length;
}
/**
 * Facteur de conversion : `noteSur5` rend une note sur 5, l'indicateur
 * CSAT est exprimé sur 100.
 *
 * Nommer la constante évite la confusion la plus probable sur ce fichier :
 * un `* 100` au lieu d'un `* 20` produit un CSAT de 400 chez un client
 * qui a mis 4/5 — invisible en recette, immediately visible en
 * production.
 */
export const FACTEUR_NOTE5_VERS_100 = 20;
/**
 * Score de satisfaction d'un avis, sur 100 (moyenne de ses lignes
 * notables). `null` si l'avis n'a aucune note de satisfaction
 * exploitable.
 */
export function scoreAvis100(lignes) {
    const notes = [];
    for (const ligne of lignes) {
        if (!estCritereSatisfaction({
            type_reponse: ligne.critere?.type_reponse,
            scoring_mode: ligne.critere?.scoring_mode,
        })) {
            continue;
        }
        const score = noteSur5(ligne);
        if (score !== null && Number.isFinite(score))
            notes.push(score);
    }
    if (notes.length === 0)
        return null;
    return (notes.reduce((somme, n) => somme + n, 0) / notes.length) * FACTEUR_NOTE5_VERS_100;
}
/**
 * CSAT : moyenne des scores PAR AVIS, sur /100.
 *
 * @param reponses lignes du périmètre (toutes familles de critères)
 * @returns le score /100, ou `null` si aucune note de satisfaction
 */
export function csatParAvis(reponses) {
    const scores = scoresAvisSatisfaction(reponses);
    if (scores.length === 0)
        return null;
    return scores.reduce((somme, n) => somme + n, 0) / scores.length;
}
/**
 * Score de chaque avis, sur 100 — la brique de base.
 *
 * Une ventilation (agence, service, guichet) et le CSAT global doivent
 * moyenner EXACTEMENT la même liste. Exposer la liste, et pas seulement
 * sa moyenne, évite qu'une ventilation refasse sa propre moyenne : c'est
 * ainsi que les deux avaient fini par diverger.
 */
export function scoresAvisSatisfaction(reponses) {
    const scores = [];
    for (const lignes of grouperParAvis(reponses)) {
        const score = scoreAvis100(lignes);
        if (score !== null)
            scores.push(score);
    }
    return scores;
}
/**
 * Répartition des avis par bande /5, pour l'histogramme du dashboard.
 * Chaque avis compte une fois : la bande est celle de son score moyen.
 */
export function distributionParAvis(reponses) {
    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const score of scoresAvisSatisfaction(reponses)) {
        const bande = Math.max(1, Math.min(5, Math.round(score / FACTEUR_NOTE5_VERS_100)));
        distribution[String(bande)] += 1;
    }
    return distribution;
}
//# sourceMappingURL=csat.js.map