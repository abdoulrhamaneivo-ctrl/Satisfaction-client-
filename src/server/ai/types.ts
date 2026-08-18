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

// Schéma de validation Zod de la réponse du modèle LLM
export const AnalyseResultSchema = z.object({
  sentiment: z.enum(SENTIMENTS_AUTORISES),
  sentiment_score: z.number().min(0).max(1),
  themes: z.array(z.enum(THEMES_AUTORISES)).min(1),
  probleme_principal: z.string().nullable().optional(),
  urgence: z.enum(URGENCE_AUTORISES),
  resume: z.string().max(300),
  action_recommandee: z.string().max(300).nullable().optional(),
});

export type AnalyseResult = z.infer<typeof AnalyseResultSchema>;

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
  analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult>;
}
