import { z } from 'zod';
export declare const THEMES_AUTORISES: readonly ["TEMPS_ATTENTE", "ACCUEIL", "PERSONNEL", "COMPORTEMENT_AGENT", "SERVICE", "PRODUIT", "QUALITE", "PRIX", "PROCEDURE", "ADMINISTRATION", "INFORMATIQUE", "PAIEMENT", "LIVRAISON", "ACCESSIBILITE", "PROPRETE", "SECURITE", "INFORMATION", "DISPONIBILITE", "AUTRE"];
export type ThemeAutorise = typeof THEMES_AUTORISES[number];
export declare const SENTIMENTS_AUTORISES: readonly ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"];
export type SentimentAutorise = typeof SENTIMENTS_AUTORISES[number];
export declare const URGENCE_AUTORISES: readonly ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export type UrgenceAutorisee = typeof URGENCE_AUTORISES[number];
export declare const AnalyseResultSchema: z.ZodObject<{
    sentiment: z.ZodEnum<{
        NEUTRAL: "NEUTRAL";
        POSITIVE: "POSITIVE";
        NEGATIVE: "NEGATIVE";
        MIXED: "MIXED";
    }>;
    sentiment_score: z.ZodNumber;
    themes: z.ZodArray<z.ZodEnum<{
        QUALITE: "QUALITE";
        TEMPS_ATTENTE: "TEMPS_ATTENTE";
        ACCUEIL: "ACCUEIL";
        PERSONNEL: "PERSONNEL";
        COMPORTEMENT_AGENT: "COMPORTEMENT_AGENT";
        SERVICE: "SERVICE";
        PRODUIT: "PRODUIT";
        PRIX: "PRIX";
        PROCEDURE: "PROCEDURE";
        ADMINISTRATION: "ADMINISTRATION";
        INFORMATIQUE: "INFORMATIQUE";
        PAIEMENT: "PAIEMENT";
        LIVRAISON: "LIVRAISON";
        ACCESSIBILITE: "ACCESSIBILITE";
        PROPRETE: "PROPRETE";
        SECURITE: "SECURITE";
        INFORMATION: "INFORMATION";
        DISPONIBILITE: "DISPONIBILITE";
        AUTRE: "AUTRE";
    }>>;
    probleme_principal: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    urgence: z.ZodEnum<{
        LOW: "LOW";
        CRITICAL: "CRITICAL";
        HIGH: "HIGH";
        MEDIUM: "MEDIUM";
    }>;
    resume: z.ZodString;
    action_recommandee: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type AnalyseResult = z.infer<typeof AnalyseResultSchema>;
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
/**
 * Croise la note (1-5) avec le sentiment détecté dans le commentaire.
 * - sentiment texte POSITIVE + note ≤ 2 → incohérence (note trop basse)
 * - sentiment texte NEGATIVE + note ≥ 4 → incohérence (note trop haute, le cas
 *   classique du 5/5 rancunier) — dans ce cas le sentiment du TEXTE prime :
 *   on retient NEGATIVE (ou MIXED si la note positive a aussi un fond réel),
 *   afin que les statistiques ne comptent pas cet avis comme satisfait.
 */
export declare function evaluerCoherenceNote(note: number | null | undefined, sentimentTexte: SentimentAutorise, resume: string): CoherenceNoteAvis;
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
//# sourceMappingURL=types.d.ts.map