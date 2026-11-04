import type { ContextAvis, AnalyseResult, SyntheseGlobale } from './types';
type ProviderName = 'nvidia' | 'openrouter';
declare class AIServiceManager {
    private lastProbeAt;
    private lastProbeStatus;
    private lastProbeProvider;
    private lastProbeModel;
    private testMode;
    private primaryProviderName;
    private providerOrder;
    private providerConfigured;
    private availableProviders;
    private createProvider;
    private modelFor;
    model(): string;
    modelIsFree(name?: ProviderName): boolean;
    isConfigured(): boolean;
    nomProviderEffectif(): string;
    status(): {
        configured: boolean;
        modelIsFree: boolean;
        provider: string;
        model: string;
        baseUrl: string;
        testMode: boolean;
        fallbackProvider: string | null;
        fallbackConfigured: boolean;
        verifiedAt: string | null;
        lastProbeStatus: "success" | "failed" | null;
        lastProbeProvider: string | null;
        lastProbeModel: string | null;
    };
    private runWithFallback;
    testerConnexion(): Promise<{
        verifiedAt: string;
        lastProbeStatus: 'success';
        provider: string;
        model: string;
    }>;
    analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<{
        result: AnalyseResult;
        provider: string;
        model: string;
    }>;
    syntheseGlobale(promptAgregats: string): Promise<{
        synthese: SyntheseGlobale;
        provider: string;
        model: string;
    }>;
}
export declare const AIService: AIServiceManager;
export {};
//# sourceMappingURL=service.d.ts.map