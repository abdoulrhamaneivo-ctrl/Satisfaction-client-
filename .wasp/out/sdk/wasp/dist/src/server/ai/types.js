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
];
export const SENTIMENTS_AUTORISES = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'];
export const URGENCE_AUTORISES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
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
/** Polarité attendue d'une note 1-5 : 1-2 négative, 3 neutre, 4-5 positive. */
function polariteAttendueDeNote(note) {
    if (note == null || !Number.isFinite(note))
        return null;
    const n = Math.round(note);
    if (n <= 2)
        return 'NEGATIVE';
    if (n === 3)
        return 'NEUTRAL';
    if (n >= 4)
        return 'POSITIVE';
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
export function evaluerCoherenceNote(note, sentimentTexte, resume) {
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
            explication: `Incohérence détectée : note ${note}/5 (positive) mais commentaire négatif. ` +
                `${resume} Le sentiment négatif du texte prime sur la note : ne pas compter cet avis comme satisfait.`,
            sentiment_retenu: 'NEGATIVE',
        };
    }
    if (!noteHaute && sentimentTexte === 'POSITIVE') {
        return {
            incoherent: true,
            type: 'NOTE_PLUS_BASSE_QUE_TEXTE',
            explication: `Incohérence détectée : note ${note}/5 (basse) mais commentaire positif. ` +
                `${resume} Le texte exprime une satisfaction réelle malgré la note.`,
            // La note basse reste un signal de mécontentement fort : MIXED reflète l'écart
            sentiment_retenu: 'MIXED',
        };
    }
    return { incoherent: false, type: null, explication: null, sentiment_retenu: sentimentTexte };
}
// ---------- Synthèse globale (Phase G) ----------
// L'IA VERBALISE des agrégats déterministes : elle ne mesure rien, ne
// compte rien, n'invente aucun chiffre — chaque conclusion doit s'appuyer
// sur une statistique fournie (le prompt l'exige, le schéma le contraint).
export const CONFIANCES_AUTORISEES = ['FAIBLE', 'MOYENNE', 'ELEVEE'];
export const SyntheseGlobaleSchema = z.object({
    resume_executif: z.string().min(1).max(800),
    points_positifs: z.array(z.string().min(1).max(200)).max(6),
    points_negatifs: z.array(z.string().min(1).max(200)).max(6),
    irritants: z.array(z.object({
        // Vague 5, P10 : `min(1)` sur le thème. Une chaîne vide passerait le
        // filtre d'appariement et disparaîtrait silencieusement de l'analyse ;
        // mieux vaut refuser la réponse et la rejouer (le job remet en PENDING
        // sous le quota de tentatives) que d'enregistrer une synthèse amputée
        // d'un irritant sans que rien ne le signale.
        theme: z.string().min(1).max(40),
        constat: z.string().min(1).max(300),
        // La priorité est réécrite par le serveur (valeur déterministe). Elle
        // reste bornée ici pour qu'une réponse aberrante soit rejetée plutôt
        // que normalisée en silence.
        priorite: z.number().int().min(0).max(100),
        confiance: z.enum(CONFIANCES_AUTORISEES),
    })).max(8),
    tendances: z.array(z.string().min(1).max(200)).max(6),
    anomalies: z.array(z.string().min(1).max(200)).max(6),
    priorites: z.array(z.string().min(1).max(200)).max(5),
    confiance: z.enum(CONFIANCES_AUTORISEES),
    limites: z.array(z.string().min(1).max(200)).max(6),
});
// Version du prompt de synthèse (stockée sur chaque analyse globale).
export const PROMPT_SYNTHESE_VERSION = '1';
export const PROMPT_SYNTHESE_SYSTEM = `Tu es le synthétiseur d'expérience client de YEBA pour une direction d'entreprise.

RÈGLE ABSOLUE : tu ne mesures rien. Tous les chiffres dont tu as besoin sont
FOURNIS dans le message utilisateur (volumes, scores, répartitions, évolutions).
- Chaque affirmation chiffrée de ta synthèse doit reprendre un nombre fourni.
- Donnée absente ou marquée "non disponible" : écris "non disponible",
  jamais une approximation, jamais une invention.
- Les irritants sont fournis PRÉ-CLASSÉS par priorité calculée : conserve
  cet ordre, ne le recalcule pas.
- Signale explicitement les limites (faible volume, données manquantes).

Tu dois toujours retourner uniquement un JSON valide respectant exactement
le schéma demandé. N'ajoute aucun texte en dehors du JSON.`;
//# sourceMappingURL=types.js.map