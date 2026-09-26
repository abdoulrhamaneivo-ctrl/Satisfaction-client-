// src/server/ai/deepseekProvider.ts
import OpenAI from 'openai';
import { extraireObjetJson, validerReponseJson } from './chatJson';
import { MAX_TOKENS_ANALYSE, MAX_TOKENS_SYNTHESE, SYSTEM_PROMPT } from './prompts';
import { AnalyseResultSchema, PROMPT_SYNTHESE_SYSTEM, SyntheseGlobaleSchema } from './types';
export class DeepseekProvider {
    /** Modèle effectif (traçabilité Phase F). */
    nomModele() {
        return this.model;
    }
    name = 'deepseek';
    client = null;
    model;
    constructor() {
        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (apiKey && apiKey.trim().length > 0) {
            this.client = new OpenAI({
                baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
                apiKey: apiKey.trim(),
                // Sans borne, un appel IA pendu bloquait le worker PgBoss (défaut SDK ~10 min).
                timeout: 25000,
            });
        }
    }
    async analyserAvis(commentaire, contexte) {
        if (!this.client) {
            throw new Error('DEEPSEEK_API_KEY non configurée dans les variables d’environnement.');
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
            max_tokens: MAX_TOKENS_ANALYSE,
        });
        const msg = response.choices[0]?.message;
        // FIX 05/09 (même repli que le provider OpenRouter) : un modèle reasoning
        // (DeepSeek-R1...) renvoie content=null avec la production dans
        // reasoning_content — sinon « Réponse vide » systématique.
        let content = msg?.content;
        if (!content && typeof msg?.reasoning_content === 'string' && msg.reasoning_content.trim()) {
            content = msg.reasoning_content;
        }
        if (!content && typeof msg?.reasoning === 'string' && msg.reasoning.trim()) {
            content = msg.reasoning;
        }
        if (!content) {
            const fin = response.choices[0]?.finish_reason ?? '?';
            throw new Error(`Réponse vide du modèle DeepSeek (${this.model}, fin=${fin}).`);
        }
        // Extraction propre du JSON si le modèle inclut des balises Markdown ```json ... ```
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        let rawJson;
        try {
            rawJson = JSON.parse(jsonStr);
        }
        catch {
            // Repli : isole le premier objet {...} (réflexion + JSON à la fin).
            const debut = jsonStr.indexOf('{');
            const fin = jsonStr.lastIndexOf('}');
            if (debut === -1 || fin <= debut) {
                throw new Error('JSON malformé retourné par DeepSeek (aucun objet détecté).');
            }
            try {
                rawJson = JSON.parse(jsonStr.slice(debut, fin + 1));
            }
            catch (err) {
                throw new Error(`JSON malformé retourné par DeepSeek: ${err?.message}`);
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
            throw new Error('DEEPSEEK_API_KEY non configurée dans les variables d’environnement. non configurée.');
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
