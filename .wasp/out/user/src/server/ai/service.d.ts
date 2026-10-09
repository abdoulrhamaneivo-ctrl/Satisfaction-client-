import type { ContextAvis, AnalyseResult, SyntheseGlobale } from './types';
type ProbeStatus = 'success' | 'failed' | null;
declare class AIServiceManager {
    private lastProbeAt;
    private lastProbeStatus;
    private provider;
    model(): string;
    modelIsFree(): boolean;
    isConfigured(): boolean;
    nomProviderEffectif(): string;
    status(): {
        configured: boolean;
        modelIsFree: boolean;
        provider: string;
        model: string;
        baseUrl: string;
        verifiedAt: string | null;
        lastProbeStatus: ProbeStatus;
    };
    testerConnexion(): Promise<{
        verifiedAt: string;
        lastProbeStatus: 'success';
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
