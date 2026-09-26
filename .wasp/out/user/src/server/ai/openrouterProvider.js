// src/server/ai/openrouterProvider.ts
import OpenAI from 'openai';
import { extraireObjetJson, validerReponseJson } from './chatJson';
import { MAX_TOKENS_ANALYSE, MAX_TOKENS_SYNTHESE, SYSTEM_PROMPT } from './prompts';
import { AnalyseResultSchema, PROMPT_SYNTHESE_SYSTEM, SyntheseGlobaleSchema } from './types';
export class OpenRouterProvider {
    /** Modèle effectif (traçabilité Phase F). */
    nomModele() {
        return this.model;
    }
    name = 'openrouter';
    client = null;
    model;
    constructor() {
        this.model = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free';
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (apiKey && apiKey.trim().length > 0) {
            this.client = new OpenAI({
                baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
                apiKey: apiKey,
                // Sans borne, un appel IA pendu bloquait le worker PgBoss (défaut SDK ~10 min).
                timeout: 25000,
            });
        }
    }
    async analyserAvis(commentaire, contexte) {
        if (!this.client) {
            throw new Error('OPENROUTER_API_KEY non configurée dans les variables d’environnement.');
        }
        const promptUtilisateur = `Analyse cet avis client.

NOTE :
${contexte?.score !== undefined && contexte?.score !== null ? contexte.score : 'Non fournie'}

AVIS :
${commentaire.trim()}

CONTEXTE OPTIONNEL :
Agence : ${contexte?.agence || 'null'}
Guichet : ${contexte?.guichet || 'null'}
Service : ${contexte?.service || 'null'}
Critere : ${contexte?.critere || 'null'}
Agent : ${contexte?.agent || 'null'}

Retourne exclusivement le JSON demandé.`;
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: promptUtilisateur },
            ],
            temperature: 0.1,
            // FIX 05/09 : les modèles « reasoning » brûlent des tokens en réflexion
            // AVANT le JSON — à 500, la réflexion seule saturait la sortie et le
            // JSON n'était jamais émis (« aucun objet détecté »). 1500 laisse la
            // réflexion + le JSON tenir ensemble ; le JSON reste borné (~200 tokens).
            max_tokens: MAX_TOKENS_ANALYSE,
            // Les modèles « reasoning » (Nemotron, DeepSeek-R1...) produisent un
            // texte de réflexion avant le JSON : on le désactive explicitement
            // pour que la réponse soit directement parsable. Certains modèles
            // rejettent ce paramètre : dans ce cas on retente sans.
        }).catch(async (err) => {
            if (String(err?.message ?? '').includes('reasoning')) {
                return this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: promptUtilisateur },
                    ],
                    temperature: 0.1,
                    max_tokens: MAX_TOKENS_ANALYSE,
                });
            }
            throw err;
        });
        const msg = response.choices[0]?.message;
        // FIX 05/09 (« IA indisponible ») : les modèles « reasoning » (Nemotron,
        // DeepSeek-R1...) renvoient HTTP 200 avec content=null — leur production
        // est dans reasoning_content / reasoning. Sans ce repli, chaque analyse
        // échouait en « Réponse vide du modèle » après 3 tentatives.
        let content = msg?.content;
        if (!content && typeof msg?.reasoning_content === 'string' && msg.reasoning_content.trim()) {
            content = msg.reasoning_content;
        }
        if (!content && typeof msg?.reasoning === 'string' && msg.reasoning.trim()) {
            content = msg.reasoning;
        }
        if (!content) {
            const fin = response.choices[0]?.finish_reason ?? '?';
            throw new Error(`Réponse vide du modèle (${this.model}, fin=${fin}).`);
        }
        // Extraction du JSON : direct si le modèle répond proprement, sinon on
        // isole le premier objet {...} (cas reasoning : longue réflexion + JSON
        // à la fin). La validation Zod stricte derrière reste la vraie barrière.
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        let rawJson;
        try {
            rawJson = JSON.parse(jsonStr);
        }
        catch {
            const debut = jsonStr.indexOf('{');
            const fin = jsonStr.lastIndexOf('}');
            if (debut === -1 || fin <= debut) {
                throw new Error(`JSON malformé retourné par l'IA (aucun objet détecté).`);
            }
            try {
                rawJson = JSON.parse(jsonStr.slice(debut, fin + 1));
            }
            catch (err) {
                throw new Error(`JSON malformé retourné par l'IA: ${err?.message}`);
            }
        }
        // Validation stricte Zod côté serveur
        const parseResult = AnalyseResultSchema.safeParse(rawJson);
        if (!parseResult.success) {
            throw new Error(`Schéma JSON invalide retourné par l'IA: ${parseResult.error.message}`);
        }
        return parseResult.data;
    }
    /**
     * Synthèse globale (vague 1, Phase G) : verbalise des agrégats DÉJÀ
     * calculés — ne mesure rien. Tentative unique (le service bascule de
     * provider en cas d'échec).
     */
    async syntheseGlobale(promptAgregats) {
        if (!this.client) {
            throw new Error('OPENROUTER_API_KEY non configurée dans les variables d’environnement. non configurée.');
        }
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: PROMPT_SYNTHESE_SYSTEM },
                { role: 'user', content: promptAgregats },
            ],
            temperature: 0.1,
            max_tokens: MAX_TOKENS_SYNTHESE,
        });
        const msg = response.choices[0]?.message;
        const brut = extraireObjetJson(`synthèse ${this.name}`, msg?.content || msg?.reasoning_content || msg?.reasoning);
        return validerReponseJson(`synthèse ${this.name}`, SyntheseGlobaleSchema, brut);
    }
}
