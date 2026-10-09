import type { ContextAvis, AnalyseResult, SyntheseGlobale } from './types';
import { OpenRouterProvider } from './openrouterProvider';

type ProbeStatus = 'success' | 'failed' | null;

class AIServiceManager {
  private lastProbeAt: string | null = null;
  private lastProbeStatus: ProbeStatus = null;

  private provider(): OpenRouterProvider {
    return new OpenRouterProvider();
  }

  model(): string {
    return process.env.OPENROUTER_MODEL?.trim() || 'nvidia/nemotron-3.5-lightning:free';
  }

  modelIsFree(): boolean {
    return this.model().endsWith(':free');
  }

  isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY?.trim()) && this.modelIsFree();
  }

  nomProviderEffectif(): string {
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

  async testerConnexion(): Promise<{ verifiedAt: string; lastProbeStatus: 'success' }> {
    if (!this.isConfigured()) throw new Error('AI_NOT_CONFIGURED_OR_NOT_FREE');
    try {
      await this.provider().testerConnexion();
      this.lastProbeAt = new Date().toISOString();
      this.lastProbeStatus = 'success';
      return { verifiedAt: this.lastProbeAt, lastProbeStatus: 'success' };
    } catch {
      this.lastProbeAt = new Date().toISOString();
      this.lastProbeStatus = 'failed';
      // Ne propage ni corps de requête ni réponse du fournisseur dans le client.
      throw new Error('AI_PROVIDER_UNAVAILABLE_OR_POLICY_REJECTED');
    }
  }

  async analyserAvis(
    commentaire: string,
    contexte?: ContextAvis,
  ): Promise<{ result: AnalyseResult; provider: string; model: string }> {
    if (!this.isConfigured()) throw new Error('AI_NOT_CONFIGURED_OR_NOT_FREE');
    try {
      const instance = this.provider();
      const result = await instance.analyserAvis(commentaire, contexte);
      return { result, provider: instance.name, model: instance.nomModele() };
    } catch {
      throw new Error('AI_PROVIDER_UNAVAILABLE_OR_POLICY_REJECTED');
    }
  }

  async syntheseGlobale(
    promptAgregats: string,
  ): Promise<{ synthese: SyntheseGlobale; provider: string; model: string }> {
    if (!this.isConfigured()) throw new Error('AI_NOT_CONFIGURED_OR_NOT_FREE');
    try {
      const instance = this.provider();
      const synthese = await instance.syntheseGlobale(promptAgregats);
      return { synthese, provider: instance.name, model: instance.nomModele() };
    } catch {
      throw new Error('AI_PROVIDER_UNAVAILABLE_OR_POLICY_REJECTED');
    }
  }
}

export const AIService = new AIServiceManager();
