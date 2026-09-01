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
  critere?: {
    type_reponse?: string | null;
    options_reponse?: string | null;
  } | null;
  commentaire_texte?: string | null;
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

/**
 * Concatène les commentaires distincts d'une soumission en un seul texte
 * lisible. Depuis que chaque ligne Reponse peut porter son propre texte
 * (réponse à un critère de type TEXTE, en plus du commentaire final libre),
 * ne garder que celui de la première ligne du groupe en perdait une partie —
 * ex. le commentaire final de l'étape "Message ou suggestion" s'il n'était
 * pas répondu au premier critère du formulaire.
 */
export function commentairesDeGroupe<T extends ReponseAvecSoumission>(
  groupe: T[]
): string {
  const vus = new Set<string>();
  const textes: string[] = [];
  for (const r of groupe) {
    const t = (r.commentaire_texte || '').trim();
    if (t && !vus.has(t)) {
      vus.add(t);
      textes.push(t);
    }
  }
  return textes.join(' • ');
}


export function compterAvis<T extends ReponseAvecSoumission>(reponses: T[]): number {
  return regrouperParSoumission(reponses).length;
}

/**
 * Ramène les réponses quantitatives sur une échelle commune de 1 à 5.
 * Les réponses de collecte libre ne sont pas des mesures de satisfaction :
 * les inclure dans une moyenne créerait un score artificiel.
 */
export function scoreNormaliseSur5(reponse: ReponseAvecSoumission): number | null {
  const type = reponse.critere?.type_reponse;
  if (type === 'TEXTE' || type === 'CASES' || type === 'QCM') return null;

  if (type === 'ECHELLE') {
    const [minBrut, maxBrut] = (reponse.critere?.options_reponse || '1,5').split(',');
    const min = Number(minBrut);
    const max = Number(maxBrut);
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      const ratio = (reponse.score_brut - min) / (max - min);
      return Math.max(1, Math.min(5, 1 + ratio * 4));
    }
  }

  return reponse.score_brut >= 1 && reponse.score_brut <= 5 ? reponse.score_brut : null;
}

/**
 * Score moyen PAR AVIS : chaque soumission compte pour 1, quel que soit son
 * nombre de critères (une soumission à 5 critères ne doit pas peser 5x plus
 * qu'une soumission à 1 critère dans une moyenne globale).
 */
export function scoreMoyenParAvis<T extends ReponseAvecSoumission>(reponses: T[]): number[] {
  return regrouperParSoumission(reponses)
    .map((g) => {
      const scores = g.reponses
        .map(scoreNormaliseSur5)
        .filter((score): score is number => score !== null);
      if (scores.length === 0) return null;
      return scores.reduce((s, score) => s + score, 0) / scores.length;
    })
    .filter((score): score is number => score !== null);
}
