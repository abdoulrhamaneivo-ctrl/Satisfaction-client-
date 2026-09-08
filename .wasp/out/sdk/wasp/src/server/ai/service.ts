// src/server/ai/service.ts
import { AIProvider, AnalyseResult, ContextAvis } from './types';
import { DeepseekProvider } from './deepseekProvider';
import { NvidiaProvider } from './nvidiaProvider';
import { OpenRouterProvider } from './openrouterProvider';

type ProviderName = 'nvidia' | 'openrouter' | 'deepseek';

function cleConfiguree(name: ProviderName): boolean {
  if (name === 'nvidia') return Boolean(process.env.NVIDIA_API_KEY?.trim());
  if (name === 'deepseek') return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function creerProvider(name: ProviderName): AIProvider {
  if (name === 'nvidia') return new NvidiaProvider();
  if (name === 'deepseek') return new DeepseekProvider();
  return new OpenRouterProvider();
}

class AIServiceManager {
  providerName: ProviderName;

  constructor() {
    // Choix du fournisseur via AI_PROVIDER : 'nvidia' (Mistral via NIM direct,
    // gratuit ~40 req/min), 'openrouter' (défaut historique) ou 'deepseek'.
    const raw = (process.env.AI_PROVIDER || 'openrouter').toLowerCase();
    this.providerName = raw === 'nvidia' || raw === 'deepseek' ? (raw as ProviderName) : 'openrouter';
  }

  /** Ordre d'essai : provider principal puis secours configurés. */
  private ordreEssai(): ProviderName[] {
    const ordre: ProviderName[] = [this.providerName];
    // Secours : NVIDIA d'abord (gratuit direct), puis OpenRouter, puis DeepSeek.
    for (const name of ['nvidia', 'openrouter', 'deepseek'] as ProviderName[]) {
      if (!ordre.includes(name) && cleConfiguree(name)) ordre.push(name);
    }
    return ordre.filter((n) => cleConfiguree(n));
  }

  isConfigured(): boolean {
    return this.ordreEssai().length > 0;
  }

  /** Provider principal effectif (pour getAIStatus). */
  nomProviderEffectif(): string {
    return this.ordreEssai()[0] ?? this.providerName;
  }

  async analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult> {
    const ordre = this.ordreEssai();
    if (ordre.length === 0) {
      throw new Error('Service IA non configuré (ni NVIDIA_API_KEY, ni OPENROUTER_API_KEY, ni DEEPSEEK_API_KEY).');
    }
    let derniereErreur: any = null;
    for (const name of ordre) {
      try {
        return await creerProvider(name).analyserAvis(commentaire, contexte);
      } catch (err: any) {
        derniereErreur = err;
        // Bascule silencieuse sur le secours ; log serveur pour le diagnostic.
        if (ordre.length > 1) console.warn(`[AI] Provider ${name} en échec, bascule secours:`, err?.message);
      }
    }
    throw derniereErreur ?? new Error('Service IA indisponible (tous les providers en échec).');
  }
}

export const AIService = new AIServiceManager();
