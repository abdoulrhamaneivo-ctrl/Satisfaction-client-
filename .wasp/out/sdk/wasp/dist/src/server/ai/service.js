import { OpenRouterProvider } from './openrouterProvider';
class AIServiceManager {
    lastProbeAt = null;
    lastProbeStatus = null;
    provider() {
        return new OpenRouterProvider();
    }
    model() {
        return process.env.OPENROUTER_MODEL?.trim() || 'nvidia/nemotron-3.5-lightning:free';
    }
    modelIsFree() {
        return this.model().endsWith(':free');
    }
    isConfigured() {
        return Boolean(process.env.OPENROUTER_API_KEY?.trim()) && this.modelIsFree();
    }
    nomProviderEffectif() {
        return 'OpenRouter';
    }
    status() {
        return {
            configured: this.isConfigured(),
            modelIsFree: this.modelIsFree(),
            provider: 'OpenRouter',
            model: this.model(),
            baseUrl: 'https://openrouter.ai/api/v1',
            verifiedAt: this.lastProbeAt,
            lastProbeStatus: this.lastProbeStatus,
        };
    }
    async testerConnexion() {
        if (!this.isConfigured())
            throw new Error('AI_NOT_CONFIGURED_OR_NOT_FREE');
        try {
            await this.provider().testerConnexion();
            this.lastProbeAt = new Date().toISOString();
            this.lastProbeStatus = 'success';
            return { verifiedAt: this.lastProbeAt, lastProbeStatus: 'success' };
        }
        catch {
            this.lastProbeAt = new Date().toISOString();
            this.lastProbeStatus = 'failed';
            // Ne propage ni corps de requête ni réponse du fournisseur dans le client.
            throw new Error('AI_PROVIDER_UNAVAILABLE_OR_POLICY_REJECTED');
        }
    }
    async analyserAvis(commentaire, contexte) {
        if (!this.isConfigured())
            throw new Error('AI_NOT_CONFIGURED_OR_NOT_FREE');
        try {
            const instance = this.provider();
            const result = await instance.analyserAvis(commentaire, contexte);
            return { result, provider: instance.name, model: instance.nomModele() };
        }
        catch {
            throw new Error('AI_PROVIDER_UNAVAILABLE_OR_POLICY_REJECTED');
        }
    }
    async syntheseGlobale(promptAgregats) {
        if (!this.isConfigured())
            throw new Error('AI_NOT_CONFIGURED_OR_NOT_FREE');
        try {
            const instance = this.provider();
            const synthese = await instance.syntheseGlobale(promptAgregats);
            return { synthese, provider: instance.name, model: instance.nomModele() };
        }
        catch {
            throw new Error('AI_PROVIDER_UNAVAILABLE_OR_POLICY_REJECTED');
        }
    }
}
export const AIService = new AIServiceManager();
//# sourceMappingURL=service.js.map