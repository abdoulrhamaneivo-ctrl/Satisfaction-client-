import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Regroupe des lignes Reponse (une par critère répondu) en avis distincts :
// toutes les lignes qui partagent le même id_soumission forment UN SEUL
// avis. Miroir client de src/server/soumissions.ts — voir
// docs/logique-avis-uniques.md pour le pourquoi. Les lignes "legacy" sans
// id_soumission (avant l'introduction de ce champ) restent chacune leur
// propre avis.
export function regrouperAvisParSoumission<T extends { id: any; id_soumission?: string | null; score_brut: number }>(
  reponses: T[]
): { id_soumission: string | null; reponses: T[]; score_moyen: number }[] {
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
    const total = groupe.reduce((s, r) => s + r.score_brut, 0);
    return {
      id_soumission: groupe[0].id_soumission ?? null,
      reponses: groupe,
      score_moyen: parseFloat((total / groupe.length).toFixed(2)),
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
