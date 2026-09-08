import { DeepseekProvider } from './deepseekProvider';
import { NvidiaProvider } from './nvidiaProvider';
import { OpenRouterProvider } from './openrouterProvider';
function cleConfiguree(name) {
    if (name === 'nvidia')
        return Boolean(process.env.NVIDIA_API_KEY?.trim());
    if (name === 'deepseek')
        return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
    return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}
function creerProvider(name) {
    if (name === 'nvidia')
        return new NvidiaProvider();
    if (name === 'deepseek')
        return new DeepseekProvider();
    return new OpenRouterProvider();
}
class AIServiceManager {
    providerName;
    constructor() {
        // Choix du fournisseur via AI_PROVIDER : 'nvidia' (Mistral via NIM direct,
        // gratuit ~40 req/min), 'openrouter' (défaut historique) ou 'deepseek'.
        const raw = (process.env.AI_PROVIDER || 'openrouter').toLowerCase();
        this.providerName = raw === 'nvidia' || raw === 'deepseek' ? raw : 'openrouter';
    }
    /** Ordre d'essai : provider principal puis secours configurés. */
    ordreEssai() {
        const ordre = [this.providerName];
        // Secours : NVIDIA d'abord (gratuit direct), puis OpenRouter, puis DeepSeek.
        for (const name of ['nvidia', 'openrouter', 'deepseek']) {
            if (!ordre.includes(name) && cleConfiguree(name))
                ordre.push(name);
        }
        return ordre.filter((n) => cleConfiguree(n));
    }
    isConfigured() {
        return this.ordreEssai().length > 0;
    }
    /** Provider principal effectif (pour getAIStatus). */
    nomProviderEffectif() {
        return this.ordreEssai()[0] ?? this.providerName;
    }
    async analyserAvis(commentaire, contexte) {
        const ordre = this.ordreEssai();
        if (ordre.length === 0) {
            throw new Error('Service IA non configuré (ni NVIDIA_API_KEY, ni OPENROUTER_API_KEY, ni DEEPSEEK_API_KEY).');
        }
        let derniereErreur = null;
        for (const name of ordre) {
            try {
                return await creerProvider(name).analyserAvis(commentaire, contexte);
            }
            catch (err) {
                derniereErreur = err;
                // Bascule silencieuse sur le secours ; log serveur pour le diagnostic.
                if (ordre.length > 1)
                    console.warn(`[AI] Provider ${name} en échec, bascule secours:`, err?.message);
            }
        }
        throw derniereErreur ?? new Error('Service IA indisponible (tous les providers en échec).');
    }
}
export const AIService = new AIServiceManager();
//# sourceMappingURL=service.js.map