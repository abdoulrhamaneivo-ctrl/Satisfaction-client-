import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
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
// Normalise une réponse sur 5 — miroir client de scoreNormaliseSur5
// (src/server/soumissions.ts). TEXTE/QCM/CASES ne sont pas des notes.
export function scoreNormaliseSur5Client(r) {
    const type = r.critere?.type_reponse;
    if (type === 'TEXTE' || type === 'CASES' || type === 'QCM')
        return null;
    if (type === 'ECHELLE') {
        const [a, b] = String(r.critere?.options_reponse || '1,5').split(',');
        const min = Number(a) || 1;
        const max = Number(b) || 5;
        if (!(max > min))
            return r.score_brut;
        return Math.max(1, Math.min(5, 1 + ((r.score_brut - min) / (max - min)) * 4));
    }
    return r.score_brut >= 1 && r.score_brut <= 5 ? r.score_brut : null;
}
// Libellé court d'une réponse pour exports : la VRAIE réponse en clair
// (texte, Oui/Non, choix), jamais un index ou un score neutre.
export function decrireReponseCourte(r) {
    const lib = r.critere?.libelle_critere || 'Critère';
    const type = r.critere?.type_reponse;
    const texte = String(r.commentaire_texte || '').trim();
    if (type === 'TEXTE' || type === 'CASES')
        return `${lib}: ${texte || '—'}`;
    if (type === 'QCM') {
        const options = String(r.critere?.options_reponse || '').split(',').map((o) => o.trim()).filter(Boolean);
        return `${lib}: ${texte || options[r.score_brut - 1] || `Option n°${r.score_brut}`}`;
    }
    if (type === 'OUI_NON')
        return `${lib}: ${r.score_brut >= 4 ? 'Oui' : 'Non'}`;
    if (type === 'ECHELLE') {
        const max = Number(String(r.critere?.options_reponse || '1,5').split(',')[1]) || 5;
        return `${lib}: ${r.score_brut}/${max}`;
    }
    return `${lib}: ${r.score_brut}/5`;
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
        const total = groupe.reduce((s, r) => s + r.score_brut, 0);
        return {
            id_soumission: groupe[0].id_soumission ?? null,
            reponses: groupe,
            score_moyen: parseFloat((total / groupe.length).toFixed(2)),
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
//# sourceMappingURL=utils.js.map