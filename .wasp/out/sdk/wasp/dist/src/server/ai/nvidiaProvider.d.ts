import { AIProvider, AnalyseResult, SyntheseGlobale, ContextAvis } from './types';
export declare class NvidiaProvider implements AIProvider {
    /** Modèle effectif (traçabilité Phase F). */
    nomModele(): string;
    name: string;
    private client;
    private model;
    constructor();
    analyserAvis(commentaire: string, contexte?: ContextAvis): Promise<AnalyseResult>;
    /**
     * Synthèse globale (vague 1, Phase G) : verbalise des agrégats DÉJÀ
     * calculés — ne mesure rien. Tentative unique (le service bascule de
     * provider en cas d'échec).
     */
    syntheseGlobale(promptAgregats: string): Promise<SyntheseGlobale>;
}
//# sourceMappingURL=nvidiaProvider.d.ts.map