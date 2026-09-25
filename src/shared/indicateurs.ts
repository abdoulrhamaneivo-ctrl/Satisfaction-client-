// src/shared/indicateurs.ts
// ============================================================================
// CATALOGUE D'INDICATEURS — vague 1, Phase H (§33-42).
// Chaque métrique expose : id, label, description, formule, source.
// Règles verrouillées :
// - jamais de dénominateur inventé (taux de réponse = N/A si absent) ;
// - bandes CSAT documentées sur /100 (pas de seuils magiques éparpillés) ;
// - DATA_QUALITY_SCORE décomposé et explicable ;
// - l'IA ne figure que comme source « analyse », jamais comme mesure.
// ============================================================================

export type SourceIndicateur = 'reponses' | 'analyse_ia' | 'mixte' | 'operationnel';

export interface DefinitionIndicateur {
  id: string;
  label: string;
  description: string;
  formule: string;
  source: SourceIndicateur;
  unite: '/100' | '%' | 'nombre' | 'indice' | 'texte';
}

/** Bandes CSAT sur /100 (seule référence — §33). */
export const BANDES_CSAT = [
  { id: 'tres_satisfaits', label: 'Très satisfaits', min: 80 },
  { id: 'satisfaits', label: 'Satisfaits', min: 60 },
  { id: 'neutres', label: 'Neutres', min: 40 },
  { id: 'insatisfaits', label: 'Insatisfaits', min: 20 },
  { id: 'tres_insatisfaits', label: 'Très insatisfaits', min: 0 },
] as const;

export const CATALOGUE_INDICATEURS: DefinitionIndicateur[] = [
  { id: 'CSAT', label: 'CSAT', description: 'Satisfaction moyenne des réponses notables.', formule: 'moyenne(score_normalise) des réponses notables', source: 'reponses', unite: '/100' },
  { id: 'SCORE_MEDIAN', label: 'Score médian', description: 'Médiane des scores normalisés (robuste aux extrêmes).', formule: 'médiane(score_normalise)', source: 'reponses', unite: '/100' },
  { id: 'TAUX_TRES_SATISFAITS', label: 'Taux très satisfaits', description: 'Part des notes ≥ 80/100.', formule: '100 × n(≥80) / n(notables)', source: 'reponses', unite: '%' },
  { id: 'TAUX_SATISFAITS', label: 'Taux satisfaits', description: 'Part des notes ≥ 60/100.', formule: '100 × n(≥60) / n(notables)', source: 'reponses', unite: '%' },
  { id: 'TAUX_NEUTRES', label: 'Taux neutres', description: 'Part des notes 40-59/100.', formule: '100 × n([40,60[) / n(notables)', source: 'reponses', unite: '%' },
  { id: 'TAUX_INSATISFAITS', label: 'Taux insatisfaits', description: 'Part des notes < 40/100.', formule: '100 × n(<40) / n(notables)', source: 'reponses', unite: '%' },
  { id: 'NPS', label: 'NPS', description: '% promoteurs − % détracteurs (jamais une moyenne).', formule: '100×(prom/n) − 100×(detr/n)', source: 'reponses', unite: 'indice' },
  { id: 'NPS_PROMOTEURS', label: 'Promoteurs', description: 'Nombre et taux de notes NPS 9-10.', formule: 'n(9-10), 100×n/total', source: 'reponses', unite: 'nombre' },
  { id: 'NPS_PASSIFS', label: 'Passifs', description: 'Nombre et taux de notes NPS 7-8.', formule: 'n(7-8), 100×n/total', source: 'reponses', unite: 'nombre' },
  { id: 'NPS_DETRACTEURS', label: 'Détracteurs', description: 'Nombre et taux de notes NPS 0-6.', formule: 'n(0-6), 100×n/total', source: 'reponses', unite: 'nombre' },
  { id: 'CES_MOYEN', label: 'CES moyen', description: "Effort perçu — seulement si le questionnaire contient une question d'effort.", formule: 'moyenne(question CES) ou N/A', source: 'reponses', unite: '/100' },
  { id: 'VOLUME_AVIS', label: "Nombre d'avis", description: 'Soumissions distinctes (1 soumission = 1 avis).', formule: 'distinct(id_soumission)', source: 'reponses', unite: 'nombre' },
  { id: 'VOLUME_COMMENTAIRES', label: 'Nombre de commentaires', description: 'Lignes avec texte non vide.', formule: 'n(commentaire non vide)', source: 'reponses', unite: 'nombre' },
  { id: 'TAUX_REPONSE', label: 'Taux de réponse', description: 'Terminés / visiteurs estimés. Dénominateur absent = N/A, jamais 0 %.', formule: '100 × terminés / visiteurs_estimés', source: 'mixte', unite: '%' },
  { id: 'TAUX_COMPLETION', label: 'Taux de complétion', description: 'Questions répondues / questions présentées.', formule: '100 × répondues / présentées', source: 'reponses', unite: '%' },
  { id: 'COHERENCE_PCT', label: 'Cohérence note/texte', description: 'Part des analyses IA sans divergence note↔texte.', formule: '100 × (1 − incohérentes/avec_texte)', source: 'analyse_ia', unite: '%' },
  { id: 'SENTIMENT_POSITIF', label: 'Sentiment positif', description: 'Part des sentiments retenus POSITIVE.', formule: '100 × n(POSITIVE retenu) / n(analyses)', source: 'analyse_ia', unite: '%' },
  { id: 'SENTIMENT_NEGATIF', label: 'Sentiment négatif', description: 'Part des sentiments retenus NEGATIVE.', formule: '100 × n(NEGATIVE retenu) / n(analyses)', source: 'analyse_ia', unite: '%' },
  { id: 'CONFIANCE_MOYENNE_IA', label: 'Confiance moyenne IA', description: 'Moyenne des confidences des analyses DONE.', formule: 'moyenne(confidence)', source: 'analyse_ia', unite: '%' },
  { id: 'DATA_QUALITY_SCORE', label: 'Qualité des données', description: 'Fiabilité du jeu : notables, commentaires, cohérence, legacy, volume.', formule: 'voir scoreQualiteDonnees()', source: 'mixte', unite: '/100' },
];

/** Distribution d'une liste de notes /100 vers les bandes CSAT. */
export function distributionBandends(notes100: number[]): Record<string, number> {
  const dist: Record<string, number> = {
    tres_satisfaits: 0, satisfaits: 0, neutres: 0, insatisfaits: 0, tres_insatisfaits: 0,
  };
  for (const n of notes100) {
    if (n >= 80) dist.tres_satisfaits += 1;
    else if (n >= 60) dist.satisfaits += 1;
    else if (n >= 40) dist.neutres += 1;
    else if (n >= 20) dist.insatisfaits += 1;
    else dist.tres_insatisfaits += 1;
  }
  return dist;
}

export function mediane(notes: number[]): number | null {
  if (notes.length === 0) return null;
  const triees = [...notes].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return triees.length % 2 === 1
    ? triees[milieu]
    : (triees[milieu - 1] + triees[milieu]) / 2;
}

export interface EntreesTauxReponse {
  visiteursEstimes?: number | null;
  questionnairesTermines: number;
}

/**
 * Taux de réponse (§32) : sans dénominateur fiable, N/A — jamais 0 %,
 * jamais une estimation déguisée.
 */
export function tauxReponse(e: EntreesTauxReponse): { taux: number | null; statut: 'OK' | 'N/A' } {
  if (e.visiteursEstimes == null || !Number.isFinite(e.visiteursEstimes) || e.visiteursEstimes <= 0) {
    return { taux: null, statut: 'N/A' };
  }
  return { taux: Math.max(0, Math.min(100, (e.questionnairesTermines / e.visiteursEstimes) * 100)), statut: 'OK' };
}

export interface EntreesQualite {
  totalReponses: number;
  notables: number;
  avecCommentaire: number;
  incoherentes: number;
  legacy: number;
  inferees: number;
}

/**
 * DATA_QUALITY_SCORE (§31) — 5 composantes documentées, toutes en [0,1] :
 * notables 35 % + commentées 20 % + cohérence 20 % + (1 − legacy) 15 % +
 * volume (saturé à 50) 10 %. Chaque terme est explicable séparément.
 */
export function scoreQualiteDonnees(e: EntreesQualite): {
  score: number;
  details: Record<'notables' | 'commentaires' | 'coherence' | 'fraicheur_legacy' | 'volume', number>;
} {
  if (e.totalReponses <= 0) {
    return { score: 0, details: { notables: 0, commentaires: 0, coherence: 0, fraicheur_legacy: 0, volume: 0 } };
  }
  const notables = e.notables / e.totalReponses;
  const commentaires = e.avecCommentaire / e.totalReponses;
  const coherence = 1 - Math.min(1, e.incoherentes / e.totalReponses);
  const fraicheurLegacy = 1 - Math.min(1, (e.legacy + e.inferees * 0.5) / e.totalReponses);
  const volume = Math.min(1, e.totalReponses / 50);
  const score = Math.round(
    100 * (0.35 * notables + 0.2 * commentaires + 0.2 * coherence + 0.15 * fraicheurLegacy + 0.1 * volume),
  );
  return {
    score,
    details: {
      notables: Math.round(notables * 100),
      commentaires: Math.round(commentaires * 100),
      coherence: Math.round(coherence * 100),
      fraicheur_legacy: Math.round(fraicheurLegacy * 100),
      volume: Math.round(volume * 100),
    },
  };
}

/** Cherche une définition au catalogue (affichage « d'où vient ce chiffre »). */
export function definitionIndicateur(id: string): DefinitionIndicateur | null {
  return CATALOGUE_INDICATEURS.find((d) => d.id === id) ?? null;
}

export interface EntreesIndice {
  /** CSAT /100 (toujours requis). */
  csat: number;
  /** NPS −100..+100 (optionnel). */
  nps?: number | null;
  /** CES /100 (optionnel, si question d'effort). */
  ces?: number | null;
}

/**
 * Indice global d'expérience /100 (§49, zone 1) — formule DOCUMENTÉE :
 * CSAT seul par défaut ; 60 % CSAT + 40 % NPS normalisé ((nps+100)/2) si
 * NPS disponible ; CES remplace 20 % du CSAT quand présent. Jamais de
 * composition cachée : la formule voyage avec la valeur (voir query).
 */
export function indiceGlobalExperience(e: EntreesIndice): { indice: number; formule: string } {
  const { csat } = e;
  if (e.nps == null && e.ces == null) {
    return { indice: Math.round(csat), formule: 'CSAT seul (NPS/CES indisponibles)' };
  }
  if (e.nps != null && e.ces == null) {
    const nps100 = (e.nps + 100) / 2;
    return {
      indice: Math.round(0.6 * csat + 0.4 * nps100),
      formule: '60 % CSAT + 40 % NPS normalisé ((nps+100)/2)',
    };
  }
  const parts: string[] = [];
  let total = 0;
  let poids = 0;
  const ajouter = (v: number | null | undefined, p: number, nom: string) => {
    if (v != null && Number.isFinite(v)) {
      total += p * v;
      poids += p;
      parts.push(`${Math.round(p * 100)} % ${nom}`);
    }
  };
  ajouter(csat, 0.5, 'CSAT');
  ajouter(e.nps != null ? (e.nps + 100) / 2 : null, 0.3, 'NPS normalisé');
  ajouter(e.ces, 0.2, 'CES');
  return {
    indice: poids > 0 ? Math.round(total / poids) : Math.round(csat),
    formule: parts.join(' + ') || 'CSAT seul',
  };
}
