import { AnalyseResult, ContextAvis } from './types';
type ProviderName = 'nvidia' | 'openrouter' | 'deepseek';
declare class AIServiceManager {
    providerName: ProviderName;
    constructor();
    /** Ordre d'essai : provider principal puis secours configurés. */
    private ordreEssai;
    isConfigured(): boolean;
    /** Provider principal effectif (pour getAIStatus). */
    nomProviderEffectif(): string;
    analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult>;
}
export declare const AIService: AIServiceManager;
export {};
//# sourceMappingURL=service.d.ts.map