// src/server/ai/service.ts
import { AIProvider, AnalyseResult, ContextAvis } from './types';
import { DeepseekProvider } from './deepseekProvider';
import { OpenRouterProvider } from './openrouterProvider';

class AIServiceManager {
  private provider: AIProvider;

  constructor() {
    // Choix du fournisseur via AI_PROVIDER : 'openrouter' (défaut) ou 'deepseek'.
    // Permet d'étendre facilement avec d'autres fournisseurs (ex: Groq, Ollama).
    const providerName = process.env.AI_PROVIDER || 'openrouter';

    switch (providerName.toLowerCase()) {
      case 'deepseek':
        this.provider = new DeepseekProvider();
        break;
      case 'openrouter':
      default:
        this.provider = new OpenRouterProvider();
        break;
    }
  }

  isConfigured(): boolean {
    if (process.env.AI_PROVIDER === 'deepseek') {
      return Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim().length > 0);
    }
    return Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0);
  }

  async analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult> {
    if (!this.isConfigured()) {
      throw new Error('Service IA non configuré (OPENROUTER_API_KEY manquante).');
    }
    return this.provider.analyserAvis(commentaire, contexte);
  }
}

export const AIService = new AIServiceManager();
