import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { decrireReponse } from "../shared/libelleReponse";
import { noteSur5 } from "../shared/noteSur5";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
// Message d'erreur actionnable pour les opérations serveur (09/2026).
// Le client HTTP abandonne à 10 s (« Request timed out ») alors que le
// serveur continue : en cas de timeout, on demande UN SEUL réessai car
// l'action a pu aboutir entre-temps (ex. invitation créée, e-mail parti).
export function messageErreurAction(err, defaut) {
    const brut = String(err?.message ?? err ?? '');
    if (/timed out|timeout|abort|aborted/i.test(brut)) {
        return ('Le serveur met trop longtemps à répondre (connexion lente). ' +
            'Patientez quelques secondes et réessayez UNE seule fois : ' +
            "l'action a pu aboutir entre-temps.");
    }
    return brut || defaut;
}
// Normalise une réponse sur 5 — Vague 1 (P2) : la règle est unique et vit dans
// `src/shared/noteSur5.ts` (exclusion du NPS et du CES, priorité au
// score_normalise stocké). Elle ne fut plus réimplémentée ici : les copies
// divergentes étaient la cause du CES inversé et du NPS compté en étoiles.
export function scoreNormaliseSur5Client(r) {
    return noteSur5(r);
}
// Libellé court d'une réponse pour exports : la VRAIE réponse en clair
// (texte, Oui/Non, choix), jamais un index ou un score neutre.
// Vague 2 : délégation à la règle partagée src/shared/libelleReponse.ts —
// l'identité de l'option (ReponseOption) est la seule source autorisée, plus
// aucune reconstruction `options[score_brut - 1]`.
export function decrireReponseCourte(r) {
    return decrireReponse(r);
}
// Regroupe des lignes Reponse (une par critère répondu) en avis distincts :
// toutes les lignes qui partagent le même id_soumission forment UN SEUL
// avis. Miroir client de src/server/soumissions.ts — voir
// docs/logique-avis-uniques.md pour le pourquoi. Les lignes "legacy" sans
// id_soumission (avant l'introduction de ce champ) restent chacune leur
// propre avis.
export function regrouperAvisParSoumission(reponses) {
    const index = new Map();
    const ordre = [];
    for (const r of reponses) {
        const cle = r.id_soumission ? `s:${r.id_soumission}` : `r:${String(r.id)}`;
        if (!index.has(cle)) {
            index.set(cle, []);
            ordre.push(cle);
        }
        index.get(cle).push(r);
    }
    return ordre.map((cle) => {
        const groupe = index.get(cle);
        // Vague 1 : moyenne des SEULES réponses notables (miroir serveur).
        // Un avis TEXTE-only n'a pas de note : null, jamais 0 ni 3.
        const notes = groupe
            .map((r) => scoreNormaliseSur5Client(r))
            .filter((s) => s !== null);
        return {
            id_soumission: groupe[0].id_soumission ?? null,
            reponses: groupe,
            score_moyen: notes.length > 0
                ? parseFloat((notes.reduce((s, n) => s + n, 0) / notes.length).toFixed(2))
                : null,
        };
    });
}
export function formatNumber(number) {
    if (number >= 1_000_000) {
        return (number / 1_000_000).toFixed(1) + "M";
    }
    if (number >= 1_000) {
        return (number / 1_000).toFixed(1) + "K";
    }
}
