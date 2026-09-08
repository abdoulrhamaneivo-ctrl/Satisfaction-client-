export type ResultatGeneration = {
    crees: number;
    ignores: Array<{
        guichet: string;
        agent: string;
        raison: string;
    }>;
};
export declare function genererDepuisModeles(entities: any, idAgence: number, dateDebut: string, dateFin: string): Promise<ResultatGeneration & {
    jours: number;
}>;
export declare function reconduireJournee(entities: any, idAgence: number, dateSource: string, dateCible: string): Promise<ResultatGeneration>;
export type PropositionPlanning = {
    id_guichet: number;
    nom_guichet: string;
    id_agent: string;
    nom_agent: string;
    heure_debut: string;
    heure_fin: string;
    raison: string;
};
export declare function suggererJournee(entities: any, idAgence: number, dateCible: string): Promise<{
    source: string | null;
    propositions: PropositionPlanning[];
}>;
/** Applique des propositions (suggestion validée par le chef) : revalide tout. */
export declare function appliquerPropositions(entities: any, idAgence: number, dateCible: string, lignes: Array<{
    id_guichet: number;
    id_agent: string;
    heure_debut: string;
    heure_fin: string;
}>): Promise<ResultatGeneration>;
//# sourceMappingURL=planningService.d.ts.map