import { AIProvider, AnalyseResult, ContextAvis } from './types';
export declare class DeepseekProvider implements AIProvider {
    name: string;
    private client;
    private model;
    constructor();
    analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult>;
}
//# sourceMappingURL=deepseekProvider.d.ts.map