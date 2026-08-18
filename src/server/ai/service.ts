// src/server/ai/service.ts
import { AIProvider, AnalyseResult, ContextAvis } from './types';
import { NvidiaProvider } from './nvidiaProvider';

class AIServiceManager {
  private provider: AIProvider;

  constructor() {
    // Permet d'étendre facilement avec d'autres fournisseurs (ex: Groq, Ollama) via AI_PROVIDER
    const providerName = process.env.AI_PROVIDER || 'nvidia';
    
    switch (providerName.toLowerCase()) {
      case 'nvidia':
      default:
        this.provider = new NvidiaProvider();
        break;
    }
  }

  isConfigured(): boolean {
    return Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.trim().length > 0);
  }

  async analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult> {
    if (!this.isConfigured()) {
      throw new Error('Service IA non configuré (NVIDIA_API_KEY manquante).');
    }
    return this.provider.analyserAvis(commentaire, contexte);
  }
}

export const AIService = new AIServiceManager();
