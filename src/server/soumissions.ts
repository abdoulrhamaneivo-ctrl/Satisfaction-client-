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

import { noteSur5 } from '../shared/noteSur5';

export type ReponseAvecSoumission = {
  id: number | string | bigint;
  id_soumission?: string | null;
  // Vague 1 : score_brut est NULLable (NULL = réponse non notable : TEXTE,
  // CASES catégoriel, QCM non valencé). scoreNormaliseSur5 renvoie null
  // pour ces lignes → exclues des moyennes, jamais de 0/3 déguisé.
  score_brut: number | null;
  // Vague 1 (P2) : score canonique /100 du moteur. Sa présence dans le
  // `select` des requêtes d'agrégation est ce qui rend la moyenne fidèle.
  score_normalise?: number | null;
  critere?: {
    type_reponse?: string | null;
    scoring_mode?: string | null;
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
 *
 * Vague 1 (P2) : la règle est désormais UNIQUE et vit dans
 * `src/shared/noteSur5.ts` — elle exclut explicitement le NPS et le CES
 * (indicateurs dédiés, sens d'effort inversé) au lieu de les laisser entrer
 * dans la moyenne. Les quatre implémentations divergentes qui coexistaient
 * (celle-ci, `client/utils.ts`, `DashboardCharts.normaliserScoreSur5` et
 * celle supprimée de `LigneReponse`) passent désormais toutes par ici.
 */
export function scoreNormaliseSur5(reponse: ReponseAvecSoumission): number | null {
  return noteSur5(reponse as any);
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
