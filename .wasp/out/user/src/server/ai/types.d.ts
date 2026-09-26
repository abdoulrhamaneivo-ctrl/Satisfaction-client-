import { z } from 'zod';
export declare const THEMES_AUTORISES: readonly ["TEMPS_ATTENTE", "ACCUEIL", "PERSONNEL", "COMPORTEMENT_AGENT", "SERVICE", "PRODUIT", "QUALITE", "PRIX", "PROCEDURE", "ADMINISTRATION", "INFORMATIQUE", "PAIEMENT", "LIVRAISON", "ACCESSIBILITE", "PROPRETE", "SECURITE", "INFORMATION", "DISPONIBILITE", "AUTRE"];
export type ThemeAutorise = typeof THEMES_AUTORISES[number];
export declare const SENTIMENTS_AUTORISES: readonly ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"];
export type SentimentAutorise = typeof SENTIMENTS_AUTORISES[number];
export declare const URGENCE_AUTORISES: readonly ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export type UrgenceAutorisee = typeof URGENCE_AUTORISES[number];
export declare const PROMPT_VERSION = "2";
export declare const CHAMPS_ETENDUS_PROMPT = "Champs \u00E9tendus \u2014 ajoute-les au JSON :\n- \"sous_themes\" : tableau (max 5) de pr\u00E9cisions parmi les th\u00E8mes autoris\u00E9s, ou tableau vide.\n- \"problemes_secondaires\" : tableau (max 3) de probl\u00E8mes secondaires en texte court (max 120 caract\u00E8res), ou tableau vide.\n- \"severite\" : gravit\u00E9 du probl\u00E8me principal [\"LOW\", \"MEDIUM\", \"HIGH\", \"CRITICAL\"] \u2014 g\u00EAne sans impact = LOW, dysfonctionnement av\u00E9r\u00E9 = MEDIUM, pr\u00E9judice ou risque = HIGH, danger/accusation grave/fraude = CRITICAL. Sans probl\u00E8me : \"LOW\".\n- \"emotion\" : \u00E9motion dominante per\u00E7ue en un ou deux mots (ex. \"col\u00E8re\", \"d\u00E9ception\", \"satisfaction\"), ou null si ind\u00E9terminable.\n- \"confidence\" : confiance globale 0.0-1.0 dans CETTE analyse (clart\u00E9 du texte, volume d'indices, ambigu\u00EFt\u00E9s). Texte vague ou contradictoire = confiance basse, jamais de faux semblant de certitude.";
export declare const AnalyseResultSchema: z.ZodObject<{
    sentiment: z.ZodEnum<{
        NEUTRAL: "NEUTRAL";
        POSITIVE: "POSITIVE";
        NEGATIVE: "NEGATIVE";
        MIXED: "MIXED";
    }>;
    sentiment_score: z.ZodNumber;
    themes: z.ZodArray<z.ZodEnum<{
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
        QUALITE: "QUALITE";
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
    sous_themes: z.ZodOptional<z.ZodArray<z.ZodEnum<{
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
        QUALITE: "QUALITE";
    }>>>;
    problemes_secondaires: z.ZodOptional<z.ZodArray<z.ZodString>>;
    severite: z.ZodOptional<z.ZodEnum<{
        LOW: "LOW";
        CRITICAL: "CRITICAL";
        HIGH: "HIGH";
        MEDIUM: "MEDIUM";
    }>>;
    emotion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    confidence: z.ZodOptional<z.ZodNumber>;
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
    /** Modèle effectif (pour traçabilité : stocké sur l'analyse). */
    nomModele(): string;
    analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult>;
    /** Synthèse globale à partir d'agrégats DÉJÀ calculés (vague 1, Phase G). */
    syntheseGlobale(promptAgregats: string): Promise<SyntheseGlobale>;
}
export declare const CONFIANCES_AUTORISEES: readonly ["FAIBLE", "MOYENNE", "ELEVEE"];
export type ConfianceAutorisee = typeof CONFIANCES_AUTORISEES[number];
export declare const SyntheseGlobaleSchema: z.ZodObject<{
    resume_executif: z.ZodString;
    points_positifs: z.ZodArray<z.ZodString>;
    points_negatifs: z.ZodArray<z.ZodString>;
    irritants: z.ZodArray<z.ZodObject<{
        theme: z.ZodString;
        constat: z.ZodString;
        priorite: z.ZodNumber;
        confiance: z.ZodEnum<{
            MOYENNE: "MOYENNE";
            FAIBLE: "FAIBLE";
            ELEVEE: "ELEVEE";
        }>;
    }, z.core.$strip>>;
    tendances: z.ZodArray<z.ZodString>;
    anomalies: z.ZodArray<z.ZodString>;
    priorites: z.ZodArray<z.ZodString>;
    confiance: z.ZodEnum<{
        MOYENNE: "MOYENNE";
        FAIBLE: "FAIBLE";
        ELEVEE: "ELEVEE";
    }>;
    limites: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type SyntheseGlobale = z.infer<typeof SyntheseGlobaleSchema>;
export declare const PROMPT_SYNTHESE_VERSION = "1";
export declare const PROMPT_SYNTHESE_SYSTEM = "Tu es le synth\u00E9tiseur d'exp\u00E9rience client de YEBA pour une direction d'entreprise.\n\nR\u00C8GLE ABSOLUE : tu ne mesures rien. Tous les chiffres dont tu as besoin sont\nFOURNIS dans le message utilisateur (volumes, scores, r\u00E9partitions, \u00E9volutions).\n- Chaque affirmation chiffr\u00E9e de ta synth\u00E8se doit reprendre un nombre fourni.\n- Donn\u00E9e absente ou marqu\u00E9e \"non disponible\" : \u00E9cris \"non disponible\",\n  jamais une approximation, jamais une invention.\n- Les irritants sont fournis PR\u00C9-CLASS\u00C9S par priorit\u00E9 calcul\u00E9e : conserve\n  cet ordre, ne le recalcule pas.\n- Signale explicitement les limites (faible volume, donn\u00E9es manquantes).\n\nTu dois toujours retourner uniquement un JSON valide respectant exactement\nle sch\u00E9ma demand\u00E9. N'ajoute aucun texte en dehors du JSON.";
