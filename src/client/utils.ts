import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { decrireReponse } from "../shared/libelleReponse";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Message d'erreur actionnable pour les opérations serveur (09/2026).
// Le client HTTP abandonne à 10 s (« Request timed out ») alors que le
// serveur continue : en cas de timeout, on demande UN SEUL réessai car
// l'action a pu aboutir entre-temps (ex. invitation créée, e-mail parti).
export function messageErreurAction(err: any, defaut: string): string {
  const brut = String(err?.message ?? err ?? '');
  if (/timed out|timeout|abort|aborted/i.test(brut)) {
    return (
      'Le serveur met trop longtemps à répondre (connexion lente). ' +
      'Patientez quelques secondes et réessayez UNE seule fois : ' +
      "l'action a pu aboutir entre-temps."
    );
  }
  return brut || defaut;
}

// Normalise une réponse sur 5 — miroir client de scoreNormaliseSur5
// (src/server/soumissions.ts). Vague 1 : le score_normalise STOCKÉ (/100)
// prime quand il existe (seule vérité statistique) ; le recalcul legacy
// ne sert que pour les lignes antérieures sans normalisé.
export function scoreNormaliseSur5Client(r: {
  score_brut: number | null;
  score_normalise?: number | null;
  critere?: { type_reponse?: string | null; options_reponse?: string | null } | null;
}): number | null {
  const stocke = (r as any)?.score_normalise;
  if (typeof stocke === 'number' && Number.isFinite(stocke)) {
    return Math.max(1, Math.min(5, stocke / 20));
  }
  if (r.score_brut == null) return null;
  const type = r.critere?.type_reponse;
  if (type === 'TEXTE' || type === 'CASES' || type === 'QCM') return null;
  if (type === 'ECHELLE') {
    const [a, b] = String(r.critere?.options_reponse || '1,5').split(',');
    const min = Number(a) || 1;
    const max = Number(b) || 5;
    if (!(max > min)) return r.score_brut;
    return Math.max(1, Math.min(5, 1 + ((r.score_brut - min) / (max - min)) * 4));
  }
  return r.score_brut >= 1 && r.score_brut <= 5 ? r.score_brut : null;
}

// Libellé court d'une réponse pour exports : la VRAIE réponse en clair
// (texte, Oui/Non, choix), jamais un index ou un score neutre.
// Vague 2 : délégation à la règle partagée src/shared/libelleReponse.ts —
// l'identité de l'option (ReponseOption) est la seule source autorisée, plus
// aucune reconstruction `options[score_brut - 1]`.
export function decrireReponseCourte(r: any): string {
  return decrireReponse(r);
}

// Regroupe des lignes Reponse (une par critère répondu) en avis distincts :
// toutes les lignes qui partagent le même id_soumission forment UN SEUL
// avis. Miroir client de src/server/soumissions.ts — voir
// docs/logique-avis-uniques.md pour le pourquoi. Les lignes "legacy" sans
// id_soumission (avant l'introduction de ce champ) restent chacune leur
// propre avis.
export function regrouperAvisParSoumission<T extends { id: any; id_soumission?: string | null; score_brut: number | null }>(
  reponses: T[]
): { id_soumission: string | null; reponses: T[]; score_moyen: number | null }[] {
  const index = new Map<string, T[]>();
  const ordre: string[] = [];

  for (const r of reponses) {
    const cle = r.id_soumission ? `s:${r.id_soumission}` : `r:${String(r.id)}`;
    if (!index.has(cle)) {
      index.set(cle, []);
      ordre.push(cle);
    }
    index.get(cle)!.push(r);
  }

  return ordre.map((cle) => {
    const groupe = index.get(cle)!;
    // Vague 1 : moyenne des SEULES réponses notables (miroir serveur).
    // Un avis TEXTE-only n'a pas de note : null, jamais 0 ni 3.
    const notes = groupe
      .map((r) => scoreNormaliseSur5Client(r as any))
      .filter((s): s is number => s !== null);
    return {
      id_soumission: groupe[0].id_soumission ?? null,
      reponses: groupe,
      score_moyen:
        notes.length > 0
          ? parseFloat((notes.reduce((s, n) => s + n, 0) / notes.length).toFixed(2))
          : null,
    };
  });
}

export function formatNumber(number: number) {
  if (number >= 1_000_000) {
    return (number / 1_000_000).toFixed(1) + "M";
  }
  if (number >= 1_000) {
    return (number / 1_000).toFixed(1) + "K";
  }
}
