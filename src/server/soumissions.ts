// src/server/soumissions.ts
//
// PROBLÈME CORRIGÉ : un client qui répond à un formulaire de N critères
// génère N lignes `Reponse` (une par critère), reliées entre elles par le
// même `id_soumission`. Avant ce fichier, chaque endroit du code qui devait
// "compter les avis" comptait en réalité les LIGNES Reponse — un formulaire à
// 5 questions comptait pour 5 avis au lieu d'1. Ce module centralise la seule
// définition correcte de "un avis" : toutes les lignes qui partagent le même
// `id_soumission` forment UN SEUL avis.
//
// Les avis créés avant l'introduction de `id_soumission` (ou par un appel API
// direct qui l'omettrait) ont `id_soumission = null`. On ne les fusionne
// jamais entre eux : chaque ligne sans id_soumission reste son propre avis
// (fallback sur son `id` de ligne comme clé de regroupement unique).

export type ReponseAvecSoumission = {
  id: number | string | bigint;
  id_soumission?: string | null;
  score_brut: number;
  [key: string]: any;
};

export type GroupeAvis<T> = {
  /** Clé de regroupement : id_soumission réel, ou clé synthétique si absent */
  cle: string;
  /** Vrai UUID de soumission, ou null si avis "legacy" sans regroupement */
  id_soumission: string | null;
  reponses: T[];
};

/**
 * Regroupe une liste de lignes Reponse en avis distincts.
 * Conserve l'ordre de première apparition.
 */
export function regrouperParSoumission<T extends ReponseAvecSoumission>(
  reponses: T[]
): GroupeAvis<T>[] {
  const index = new Map<string, GroupeAvis<T>>();
  const ordre: string[] = [];

  for (const r of reponses) {
    const cle = r.id_soumission ? `s:${r.id_soumission}` : `r:${r.id.toString()}`;
    if (!index.has(cle)) {
      index.set(cle, { cle, id_soumission: r.id_soumission ?? null, reponses: [] });
      ordre.push(cle);
    }
    index.get(cle)!.reponses.push(r);
  }

  return ordre.map((cle) => index.get(cle)!);
}

/** Nombre réel d'avis (soumissions) dans une liste de lignes Reponse. */
export function compterAvis<T extends ReponseAvecSoumission>(reponses: T[]): number {
  return regrouperParSoumission(reponses).length;
}

/**
 * Score moyen PAR AVIS : chaque soumission compte pour 1, quel que soit son
 * nombre de critères (une soumission à 5 critères ne doit pas peser 5x plus
 * qu'une soumission à 1 critère dans une moyenne globale).
 */
export function scoreMoyenParAvis<T extends ReponseAvecSoumission>(reponses: T[]): number[] {
  return regrouperParSoumission(reponses).map((g) => {
    const total = g.reponses.reduce((s, r) => s + r.score_brut, 0);
    return total / g.reponses.length;
  });
}
