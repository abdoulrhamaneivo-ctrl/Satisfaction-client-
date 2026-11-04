import type { ContextAvis, AnalyseResult, SyntheseGlobale, AIProvider } from './types';
import { NvidiaProvider } from './nvidiaProvider';
import { OpenRouterProvider } from './openrouterProvider';

type ProviderName = 'nvidia' | 'openrouter';
type RoutableProvider = AIProvider & { testerConnexion(): Promise<void> };

class AIServiceManager {
  private lastProbeAt: string | null = null;
  private lastProbeStatus: 'success' | 'failed' | null = null;
  private lastProbeProvider: string | null = null;
  private lastProbeModel: string | null = null;

  private testMode(): boolean {
    if (process.env.AI_TEST_MODE?.trim().toLowerCase() !== 'true') return false;
    const serviceId = process.env.RENDER_SERVICE_ID?.trim();
    const allowedTestServiceId = process.env.AI_TEST_RENDER_SERVICE_ID?.trim();
    return Boolean(serviceId && allowedTestServiceId && serviceId === allowedTestServiceId);
  }

  private primaryProviderName(): ProviderName {
    if (this.testMode() && process.env.AI_PROVIDER?.trim().toLowerCase() === 'nvidia') {
      return 'nvidia';
    }
    // La production reste OpenRouter, quel que soit AI_PROVIDER.
    return 'openrouter';
  }

  private providerOrder(): ProviderName[] {
    if (!this.testMode()) return ['openrouter'];
    return this.primaryProviderName() === 'nvidia'
      ? ['nvidia', 'openrouter']
      : ['openrouter', 'nvidia'];
  }

  private providerConfigured(name: ProviderName): boolean {
    if (name === 'nvidia') {
      return this.testMode() && Boolean(process.env.NVIDIA_API_KEY?.trim());
    }
    return Boolean(process.env.OPENROUTER_API_KEY?.trim()) && this.modelIsFree('openrouter');
  }

  private availableProviders(): ProviderName[] {
    return this.providerOrder().filter((name) => this.providerConfigured(name));
  }

  private createProvider(name: ProviderName): RoutableProvider {
    return name === 'nvidia' ? new NvidiaProvider() : new OpenRouterProvider();
  }

  private modelFor(name: ProviderName): string {
    if (name === 'nvidia') return process.env.NVIDIA_MODEL?.trim() || 'mistralai/mistral-nemotron';
    return process.env.OPENROUTER_MODEL?.trim() || 'nvidia/nemotron-3.5-lightning:free';
  }

  model(): string {
    return this.modelFor(this.primaryProviderName());
  }

  modelIsFree(name: ProviderName = this.primaryProviderName()): boolean {
    if (name === 'nvidia') return this.testMode();
    return this.modelFor('openrouter').endsWith(':free');
  }

  isConfigured(): boolean {
    return this.availableProviders().length > 0;
  }

  nomProviderEffectif(): string {
    return this.primaryProviderName() === 'nvidia' ? 'NVIDIA (test)' : 'OpenRouter';
  }

  status() {
    const primary = this.primaryProviderName();
    const fallbackName: ProviderName | null = this.testMode()
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

  private async runWithFallback<T>(
    operation: (provider: RoutableProvider) => Promise<T>,
  ): Promise<{ result: T; provider: RoutableProvider }> {
    const candidates = this.availableProviders();
    if (!candidates.length) throw new Error('AI_NOT_CONFIGURED_OR_NOT_FREE');

    for (const name of candidates) {
      try {
        const provider = this.createProvider(name);
        return { result: await operation(provider), provider };
      } catch {
        // Ne propage ni le commentaire, ni la réponse, ni l'erreur du fournisseur.
      }
    }
    throw new Error('AI_PROVIDER_UNAVAILABLE_OR_POLICY_REJECTED');
  }

  async testerConnexion(): Promise<{
    verifiedAt: string;
    lastProbeStatus: 'success';
    provider: string;
    model: string;
  }> {
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
    } catch (error) {
      this.lastProbeAt = new Date().toISOString();
      this.lastProbeStatus = 'failed';
      this.lastProbeProvider = null;
      this.lastProbeModel = null;
      throw error;
    }
  }

  async analyserAvis(
    commentaire: string,
    contexte?: ContextAvis,
  ): Promise<{ result: AnalyseResult; provider: string; model: string }> {
    const { result, provider } = await this.runWithFallback((instance) => instance.analyserAvis(commentaire, contexte));
    return { result, provider: provider.name, model: provider.nomModele() };
  }

  async syntheseGlobale(
    promptAgregats: string,
  ): Promise<{ synthese: SyntheseGlobale; provider: string; model: string }> {
    const { result, provider } = await this.runWithFallback((instance) => instance.syntheseGlobale(promptAgregats));
    return { synthese: result, provider: provider.name, model: provider.nomModele() };
  }
}

export const AIService = new AIServiceManager();
