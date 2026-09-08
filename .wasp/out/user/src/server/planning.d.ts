export declare const getModelesHoraires: (args: {
    id_agence: number;
}, context: any) => Promise<any>;
export declare const upsertModeleHoraire: (args: any, context: any) => Promise<any>;
export declare const deleteModeleHoraire: (args: {
    id: number;
}, context: any) => Promise<{
    ok: boolean;
}>;
export declare const genererPlanning: (args: {
    id_agence: number;
    date_debut: string;
    date_fin: string;
}, context: any) => Promise<import("./planningService").ResultatGeneration & {
    jours: number;
}>;
export declare const reconduirePlanning: (args: {
    id_agence: number;
    date_source: string;
    date_cible: string;
}, context: any) => Promise<import("./planningService").ResultatGeneration>;
export declare const suggererPlanning: (args: {
    id_agence: number;
    date: string;
}, context: any) => Promise<{
    source: string | null;
    propositions: import("./planningService").PropositionPlanning[];
}>;
export declare const appliquerSuggestion: (args: {
    id_agence: number;
    date: string;
    lignes: Array<{
        id_guichet: number;
        id_agent: string;
        heure_debut: string;
        heure_fin: string;
    }>;
}, context: any) => Promise<import("./planningService").ResultatGeneration>;
