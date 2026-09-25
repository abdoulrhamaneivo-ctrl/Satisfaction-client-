// src/server/ai/types.ts
import { z } from 'zod';

export const THEMES_AUTORISES = [
  'TEMPS_ATTENTE',
  'ACCUEIL',
  'PERSONNEL',
  'COMPORTEMENT_AGENT',
  'SERVICE',
  'PRODUIT',
  'QUALITE',
  'PRIX',
  'PROCEDURE',
  'ADMINISTRATION',
  'INFORMATIQUE',
  'PAIEMENT',
  'LIVRAISON',
  'ACCESSIBILITE',
  'PROPRETE',
  'SECURITE',
  'INFORMATION',
  'DISPONIBILITE',
  'AUTRE',
] as const;

export type ThemeAutorise = typeof THEMES_AUTORISES[number];

export const SENTIMENTS_AUTORISES = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'] as const;
export type SentimentAutorise = typeof SENTIMENTS_AUTORISES[number];

export const URGENCE_AUTORISES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type UrgenceAutorisee = typeof URGENCE_AUTORISES[number];

// Version du prompt d'analyse (vague 1, Phase F) : stockée sur chaque
// AnalyseAvisIA (prompt_version) pour comparer les résultats dans le temps.
// Incrémenter À CHAQUE modification d'un SYSTEM_PROMPT.
export const PROMPT_VERSION = '2';

// Fragment partagé (vague 1) : les 3 providers interpolent ce bloc dans
// leur SYSTEM_PROMPT — une seule source au lieu de 3 copies divergentes.
export const CHAMPS_ETENDUS_PROMPT = `Champs étendus — ajoute-les au JSON :
- "sous_themes" : tableau (max 5) de précisions parmi les thèmes autorisés, ou tableau vide.
- "problemes_secondaires" : tableau (max 3) de problèmes secondaires en texte court (max 120 caractères), ou tableau vide.
- "severite" : gravité du problème principal ["LOW", "MEDIUM", "HIGH", "CRITICAL"] — gêne sans impact = LOW, dysfonctionnement avéré = MEDIUM, préjudice ou risque = HIGH, danger/accusation grave/fraude = CRITICAL. Sans problème : "LOW".
- "emotion" : émotion dominante perçue en un ou deux mots (ex. "colère", "déception", "satisfaction"), ou null si indéterminable.
- "confidence" : confiance globale 0.0-1.0 dans CETTE analyse (clarté du texte, volume d'indices, ambiguïtés). Texte vague ou contradictoire = confiance basse, jamais de faux semblant de certitude.`;

// Schéma de validation Zod de la réponse du modèle LLM.
// Les champs étendus (v2) sont OPTIONNELS : un provider en retard ou un
// modèle verbeux reste accepté, le job applique des replis documentés.
export const AnalyseResultSchema = z.object({
  sentiment: z.enum(SENTIMENTS_AUTORISES),
  sentiment_score: z.number().min(0).max(1),
  themes: z.array(z.enum(THEMES_AUTORISES)).min(1),
  probleme_principal: z.string().nullable().optional(),
  urgence: z.enum(URGENCE_AUTORISES),
  resume: z.string().max(300),
  action_recommandee: z.string().max(300).nullable().optional(),
  sous_themes: z.array(z.enum(THEMES_AUTORISES)).max(5).optional(),
  problemes_secondaires: z.array(z.string().max(120)).max(3).optional(),
  severite: z.enum(URGENCE_AUTORISES).optional(),
  emotion: z.string().max(40).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type AnalyseResult = z.infer<typeof AnalyseResultSchema>;

// ---------- Cohérence note ↔ commentaire ----------
// L'IA analyse le TEXTE ; la NOTE (1-5) est une donnée séparée. Un client
// furieux peut mettre 5/5 « pour en finir » avec un commentaire rancunier :
// le sentiment du texte prime sur la note, et l'écart est signalé pour que
// le responsable sache que la note brute ne reflète pas l'expérience réelle.

// Seuils : note convertie en polarité attendue, comparée au sentiment du texte.
export type CoherenceNoteAvis = {
  /** true si la note et le sentiment exprimé dans le texte divergent */
  incoherent: boolean;
  /** "NOTE_PLUS_HAUTE_QUE_TEXTE" (5/5 + commentaire rancunier) ou l'inverse */
  type: 'NOTE_PLUS_HAUTE_QUE_TEXTE' | 'NOTE_PLUS_BASSE_QUE_TEXTE' | null;
  /** Explique l'analyse à destination du responsable (fr) */
  explication: string | null;
  /** Le sentiment ajusté à retenir pour les statistiques (avis mixte si divergence) */
  sentiment_retenu: SentimentAutorise;
};

/** Polarité attendue d'une note 1-5 : 1-2 négative, 3 neutre, 4-5 positive. */
function polariteAttendueDeNote(note: number | null | undefined): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null {
  if (note == null || !Number.isFinite(note)) return null;
  const n = Math.round(note);
  if (n <= 2) return 'NEGATIVE';
  if (n === 3) return 'NEUTRAL';
  if (n >= 4) return 'POSITIVE';
  return null;
}

/**
 * Croise la note (1-5) avec le sentiment détecté dans le commentaire.
 * - sentiment texte POSITIVE + note ≤ 2 → incohérence (note trop basse)
 * - sentiment texte NEGATIVE + note ≥ 4 → incohérence (note trop haute, le cas
 *   classique du 5/5 rancunier) — dans ce cas le sentiment du TEXTE prime :
 *   on retient NEGATIVE (ou MIXED si la note positive a aussi un fond réel),
 *   afin que les statistiques ne comptent pas cet avis comme satisfait.
 */
export function evaluerCoherenceNote(
  note: number | null | undefined,
  sentimentTexte: SentimentAutorise,
  resume: string,
): CoherenceNoteAvis {
  const attendu = polariteAttendueDeNote(note);
  if (!attendu || sentimentTexte === 'NEUTRAL' || sentimentTexte === 'MIXED') {
    return { incoherent: false, type: null, explication: null, sentiment_retenu: sentimentTexte };
  }

  const noteHaute = attendu === 'POSITIVE'; // note 4-5
  const texteNegatif = sentimentTexte === 'NEGATIVE';

  if (noteHaute && texteNegatif) {
    return {
      incoherent: true,
      type: 'NOTE_PLUS_HAUTE_QUE_TEXTE',
      explication:
        `Incohérence détectée : note ${note}/5 (positive) mais commentaire négatif. ` +
        `${resume} Le sentiment négatif du texte prime sur la note : ne pas compter cet avis comme satisfait.`,
      sentiment_retenu: 'NEGATIVE',
    };
  }

  if (!noteHaute && sentimentTexte === 'POSITIVE') {
    return {
      incoherent: true,
      type: 'NOTE_PLUS_BASSE_QUE_TEXTE',
      explication:
        `Incohérence détectée : note ${note}/5 (basse) mais commentaire positif. ` +
        `${resume} Le texte exprime une satisfaction réelle malgré la note.`,
      // La note basse reste un signal de mécontentement fort : MIXED reflète l'écart
      sentiment_retenu: 'MIXED',
    };
  }

  return { incoherent: false, type: null, explication: null, sentiment_retenu: sentimentTexte };
}

export type ContextAvis = {
  score?: number | null;
  agence?: string | null;
  guichet?: string | null;
  service?: string | null;
  critere?: string | null;
  agent?: string | null;
};

export interface AIProvider {
  name: string;
  /** Modèle effectif (pour traçabilité : stocké sur l'analyse). */
  nomModele(): string;
  analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult>;
}
