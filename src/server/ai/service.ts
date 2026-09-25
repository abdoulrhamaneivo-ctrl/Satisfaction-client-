// src/server/ai/service.ts
import { AIProvider, AnalyseResult, ContextAvis, SyntheseGlobale } from './types';
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

  /**
   * Analyse + traçabilité (vague 1, Phase F) : renvoie le résultat ET le
   * provider/modèle EFFECTIVEMENT utilisé (secours inclus) pour stockage.
   */
  async analyserAvis(
    commentaire: string,
    contexte?: ContextAvis,
  ): Promise<{ result: AnalyseResult; provider: string; model: string }> {
    const ordre = this.ordreEssai();
    if (ordre.length === 0) {
      throw new Error('Service IA non configuré (ni NVIDIA_API_KEY, ni OPENROUTER_API_KEY, ni DEEPSEEK_API_KEY).');
    }
    let derniereErreur: any = null;
    for (const name of ordre) {
      try {
        const instance = creerProvider(name);
        const result = await instance.analyserAvis(commentaire, contexte);
        return { result, provider: instance.name, model: instance.nomModele() };
      } catch (err: any) {
        derniereErreur = err;
        // Bascule silencieuse sur le secours ; log serveur pour le diagnostic.
        if (ordre.length > 1) console.warn(`[AI] Provider ${name} en échec, bascule secours:`, err?.message);
      }
    }
    throw derniereErreur ?? new Error('Service IA indisponible (tous les providers en échec).');
  }

  /**
   * Synthèse globale (vague 1, Phase G) : même bascule multi-provider que
   * l'analyse individuelle, avec traçabilité du provider/modèle effectifs.
   */
  async syntheseGlobale(
    promptAgregats: string,
  ): Promise<{ synthese: SyntheseGlobale; provider: string; model: string }> {
    const ordre = this.ordreEssai();
    if (ordre.length === 0) {
      throw new Error('Service IA non configuré (ni NVIDIA_API_KEY, ni OPENROUTER_API_KEY, ni DEEPSEEK_API_KEY).');
    }
    let derniereErreur: any = null;
    for (const name of ordre) {
      try {
        const instance = creerProvider(name);
        const synthese = await instance.syntheseGlobale(promptAgregats);
        return { synthese, provider: instance.name, model: instance.nomModele() };
      } catch (err: any) {
        derniereErreur = err;
        if (ordre.length > 1) console.warn(`[AI] Synthèse ${name} en échec, bascule secours:`, err?.message);
      }
    }
    throw derniereErreur ?? new Error('Service IA indisponible (tous les providers en échec).');
  }
}

export const AIService = new AIServiceManager();
