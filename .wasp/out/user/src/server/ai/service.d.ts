import { AnalyseResult, ContextAvis } from './types';
declare class AIServiceManager {
    private provider;
    constructor();
    isConfigured(): boolean;
    analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult>;
}
export declare const AIService: AIServiceManager;
export {};
