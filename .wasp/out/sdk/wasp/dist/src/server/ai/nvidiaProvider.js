// src/server/ai/nvidiaProvider.ts
// Provider NVIDIA NIM direct (ex : Mistral) — API OpenAI-compatible.
// Gratuit pour proto/dev/test via build.nvidia.com (clé nvapi-*), limite
// ~40 req/min par clé partagée entre tous les modèles (pas de SLA).
// Prod = licence NVIDIA AI Enterprise. Voir docs : build.nvidia.com
import OpenAI from 'openai';
import { extraireObjetJson, validerReponseJson } from './chatJson';
import { MAX_TOKENS_ANALYSE, MAX_TOKENS_SYNTHESE, SYSTEM_PROMPT } from './prompts';
import { AnalyseResultSchema, PROMPT_SYNTHESE_SYSTEM, SyntheseGlobaleSchema } from './types';
// Modèle Mistral par défaut sur NIM. Testé le 08/09/2026 :
// 'mistralai/mistral-large-2-instruct' a été RETIRÉ du catalogue (404) —
// remplacé par 'mistralai/mistral-nemotron' (vérifié : analyse FR correcte,
// JSON conforme au schéma). Le slug reste surchargeable via NVIDIA_MODEL
// car le catalogue build.nvidia.com évolue souvent.
const DEFAULT_MODEL = 'mistralai/mistral-nemotron';
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function estErreurRateLimit(err) {
    const status = err?.status ?? err?.response?.status;
    if (status === 429)
        return true;
    const msg = String(err?.message ?? '').toLowerCase();
    return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}
export class NvidiaProvider {
    /** Modèle effectif (traçabilité Phase F). */
    nomModele() {
        return this.model;
    }
    name = 'nvidia';
    client = null;
    model;
    constructor() {
        this.model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
        const apiKey = process.env.NVIDIA_API_KEY;
        if (apiKey && apiKey.trim().length > 0) {
            this.client = new OpenAI({
                baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
                apiKey: apiKey.trim(),
                // Sans borne, un appel IA pendu bloquait le worker PgBoss (défaut SDK ~10 min).
                timeout: 25000,
            });
        }
    }
    async analyserAvis(commentaire, contexte) {
        if (!this.client) {
            throw new Error('NVIDIA_API_KEY non configurée dans les variables d’environnement (build.nvidia.com).');
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
        const tenter = () => this.client.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: promptUtilisateur },
            ],
            temperature: 0.1,
            max_tokens: MAX_TOKENS_ANALYSE,
        });
        let response;
        try {
            response = await tenter();
        }
        catch (err) {
            // Repli reasoning (Nemotron/DeepSeek sur NIM) puis retry 429 une fois.
            if (String(err?.message ?? '').includes('reasoning')) {
                response = await tenter();
            }
            else if (estErreurRateLimit(err)) {
                // Free tier ~40 RPM : petite pause puis 1 seul retry, sinon le
                // service.ts bascule sur le provider de secours (OpenRouter).
                const retryAfter = Number(err?.headers?.['retry-after'] ?? err?.response?.headers?.['retry-after']);
                await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10000) : 2000);
                try {
                    response = await tenter();
                }
                catch (retryErr) {
                    throw new Error(`Limite NVIDIA NIM atteinte (~40 req/min, free tier). Réessaie dans quelques secondes. Détail: ${retryErr?.message ?? err?.message}`);
                }
            }
            else {
                throw err;
            }
        }
        const msg = response.choices[0]?.message;
        // Même repli que les autres providers : les modèles reasoning renvoient
        // HTTP 200 avec content=null et la production dans reasoning_content.
        let content = msg?.content;
        if (!content && typeof msg?.reasoning_content === 'string' && msg.reasoning_content.trim()) {
            content = msg.reasoning_content;
        }
        if (!content && typeof msg?.reasoning === 'string' && msg.reasoning.trim()) {
            content = msg.reasoning;
        }
        if (!content) {
            const fin = response.choices[0]?.finish_reason ?? '?';
            throw new Error(`Réponse vide du modèle NVIDIA (${this.model}, fin=${fin}).`);
        }
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
                throw new Error(`JSON malformé retourné par l'IA NVIDIA (aucun objet détecté).`);
            }
            try {
                rawJson = JSON.parse(jsonStr.slice(debut, fin + 1));
            }
            catch (err) {
                throw new Error(`JSON malformé retourné par l'IA NVIDIA: ${err?.message}`);
            }
        }
        const parseResult = AnalyseResultSchema.safeParse(rawJson);
        if (!parseResult.success) {
            throw new Error(`Schéma JSON invalide retourné par l'IA NVIDIA: ${parseResult.error.message}`);
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
            throw new Error('NVIDIA_API_KEY non configurée dans les variables d’environnement (build.nvidia.com). non configurée.');
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
//# sourceMappingURL=nvidiaProvider.js.map