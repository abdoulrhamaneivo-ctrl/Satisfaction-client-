import { AnalyseResult, ContextAvis, SyntheseGlobale } from './types';
type ProviderName = 'nvidia' | 'openrouter' | 'deepseek';
declare class AIServiceManager {
    providerName: ProviderName;
    constructor();
    /** Ordre d'essai : provider principal puis secours configurés. */
    private ordreEssai;
    isConfigured(): boolean;
    /** Provider principal effectif (pour getAIStatus). */
    nomProviderEffectif(): string;
    /**
     * Analyse + traçabilité (vague 1, Phase F) : renvoie le résultat ET le
     * provider/modèle EFFECTIVEMENT utilisé (secours inclus) pour stockage.
     */
    analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<{
        result: AnalyseResult;
        provider: string;
        model: string;
    }>;
    /**
     * Synthèse globale (vague 1, Phase G) : même bascule multi-provider que
     * l'analyse individuelle, avec traçabilité du provider/modèle effectifs.
     */
    syntheseGlobale(promptAgregats: string): Promise<{
        synthese: SyntheseGlobale;
        provider: string;
        model: string;
    }>;
}
export declare const AIService: AIServiceManager;
export {};
//# sourceMappingURL=service.d.ts.map