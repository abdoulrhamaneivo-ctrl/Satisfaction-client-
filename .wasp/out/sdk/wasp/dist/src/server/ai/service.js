import { NvidiaProvider } from './nvidiaProvider';
import { OpenRouterProvider } from './openrouterProvider';
class AIServiceManager {
    lastProbeAt = null;
    lastProbeStatus = null;
    lastProbeProvider = null;
    lastProbeModel = null;
    testMode() {
        if (process.env.AI_TEST_MODE?.trim().toLowerCase() !== 'true')
            return false;
        const serviceId = process.env.RENDER_SERVICE_ID?.trim();
        const allowedTestServiceId = process.env.AI_TEST_RENDER_SERVICE_ID?.trim();
        return Boolean(serviceId && allowedTestServiceId && serviceId === allowedTestServiceId);
    }
    primaryProviderName() {
        if (this.testMode() && process.env.AI_PROVIDER?.trim().toLowerCase() === 'nvidia') {
            return 'nvidia';
        }
        // La production reste OpenRouter, quel que soit AI_PROVIDER.
        return 'openrouter';
    }
    providerOrder() {
        if (!this.testMode())
            return ['openrouter'];
        return this.primaryProviderName() === 'nvidia'
            ? ['nvidia', 'openrouter']
            : ['openrouter', 'nvidia'];
    }
    providerConfigured(name) {
        if (name === 'nvidia') {
            return this.testMode() && Boolean(process.env.NVIDIA_API_KEY?.trim());
        }
        return Boolean(process.env.OPENROUTER_API_KEY?.trim()) && this.modelIsFree('openrouter');
    }
    availableProviders() {
        return this.providerOrder().filter((name) => this.providerConfigured(name));
    }
    createProvider(name) {
        return name === 'nvidia' ? new NvidiaProvider() : new OpenRouterProvider();
    }
    modelFor(name) {
        if (name === 'nvidia')
            return process.env.NVIDIA_MODEL?.trim() || 'mistralai/mistral-nemotron';
        return process.env.OPENROUTER_MODEL?.trim() || 'nvidia/nemotron-3.5-lightning:free';
    }
    model() {
        return this.modelFor(this.primaryProviderName());
    }
    modelIsFree(name = this.primaryProviderName()) {
        if (name === 'nvidia')
            return this.testMode();
        return this.modelFor('openrouter').endsWith(':free');
    }
    isConfigured() {
        return this.availableProviders().length > 0;
    }
    nomProviderEffectif() {
        return this.primaryProviderName() === 'nvidia' ? 'NVIDIA (test)' : 'OpenRouter';
    }
    status() {
        const primary = this.primaryProviderName();
        const fallbackName = this.testMode()
            ? primary === 'nvidia' ? 'openrouter' : 'nvidia'
            : null;
        const fallbackProvider = fallbackName === 'nvidia' ? 'NVIDIA (test)' : fallbackName === 'openrouter' ? 'OpenRouter' : null;
        return {
            configured: this.isConfigured(),
            modelIsFree: this.modelIsFree(primary),
            provider: primary === 'nvidia' ? 'NVIDIA (test)' : 'OpenRouter',
            model: this.modelFor(primary),
            baseUrl: primary === 'nvidia'
                ? 'https://integrate.api.nvidia.com/v1'
                : 'https://openrouter.ai/api/v1',
            testMode: this.testMode(),
            fallbackProvider,
            fallbackConfigured: fallbackName ? this.providerConfigured(fallbackName) : false,
            verifiedAt: this.lastProbeAt,
            lastProbeStatus: this.lastProbeStatus,
            lastProbeProvider: this.lastProbeProvider,
            lastProbeModel: this.lastProbeModel,
        };
    }
    async runWithFallback(operation) {
        const candidates = this.availableProviders();
        if (!candidates.length)
            throw new Error('AI_NOT_CONFIGURED_OR_NOT_FREE');
        for (const name of candidates) {
            try {
                const provider = this.createProvider(name);
                return { result: await operation(provider), provider };
            }
            catch {
                // Ne propage ni le commentaire, ni la réponse, ni l'erreur du fournisseur.
            }
        }
        throw new Error('AI_PROVIDER_UNAVAILABLE_OR_POLICY_REJECTED');
    }
    async testerConnexion() {
        try {
            const { provider } = await this.runWithFallback((instance) => instance.testerConnexion());
            this.lastProbeAt = new Date().toISOString();
            this.lastProbeStatus = 'success';
            this.lastProbeProvider = provider.name === 'nvidia' ? 'NVIDIA (test)' : 'OpenRouter';
            this.lastProbeModel = provider.nomModele();
            return {
                verifiedAt: this.lastProbeAt,
                lastProbeStatus: 'success',
                provider: this.lastProbeProvider,
                model: this.lastProbeModel,
            };
        }
        catch (error) {
            this.lastProbeAt = new Date().toISOString();
            this.lastProbeStatus = 'failed';
            this.lastProbeProvider = null;
            this.lastProbeModel = null;
            throw error;
        }
    }
    async analyserAvis(commentaire, contexte) {
        const { result, provider } = await this.runWithFallback((instance) => instance.analyserAvis(commentaire, contexte));
        return { result, provider: provider.name, model: provider.nomModele() };
    }
    async syntheseGlobale(promptAgregats) {
        const { result, provider } = await this.runWithFallback((instance) => instance.syntheseGlobale(promptAgregats));
        return { synthese: result, provider: provider.name, model: provider.nomModele() };
    }
}
export const AIService = new AIServiceManager();
//# sourceMappingURL=service.js.map