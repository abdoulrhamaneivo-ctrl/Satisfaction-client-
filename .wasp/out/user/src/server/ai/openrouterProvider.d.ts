import { AIProvider, AnalyseResult, ContextAvis } from './types';
export declare class OpenRouterProvider implements AIProvider {
    name: string;
    private client;
    private model;
    constructor();
    analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult>;
}
