export declare function useQuery(queryFn: any, args?: any, options?: any): import("@tanstack/react-query").UseQueryResult<unknown, unknown>;
export declare function useAction(actionFn: any, _options?: any): (args?: any) => Promise<unknown>;
export declare const getFormDefinitionForGuichet: import("vitest").Mock<(_args?: any) => Promise<null>>;
export declare const soumettreAvis: import("vitest").Mock<(_args?: any) => Promise<{
    id: string;
}>>;
export declare const completerSoumission: import("vitest").Mock<(_args?: any) => Promise<{
    ok: boolean;
}>>;
export declare const getCriteres: import("vitest").Mock<() => Promise<{
    criteres: never[];
    criteresEntreprise: never[];
}>>;
export declare const getServices: import("vitest").Mock<() => Promise<never[]>>;
export declare const getGuichets: import("vitest").Mock<() => Promise<never[]>>;
export declare const getAvisGroupes: import("vitest").Mock<() => Promise<{
    avis: never[];
    hasMore: boolean;
}>>;
export declare const getAgences: import("vitest").Mock<() => Promise<never[]>>;
export declare const getCriteresParOperation: import("vitest").Mock<() => Promise<{
    operations: never[];
    nonAssignees: never[];
}>>;
export declare const getRechercheGlobale: import("vitest").Mock<() => Promise<{
    agences: never[];
    guichets: never[];
    agents: never[];
    avis: never[];
}>>;
export declare const getArchives: import("vitest").Mock<() => Promise<{
    guichets: never[];
    agences: never[];
    alertes: never[];
    taches: never[];
}>>;
export declare const getAIStatus: import("vitest").Mock<() => Promise<{
    configured: boolean;
    provider: null;
    model: null;
    baseUrl: null;
    stats: {
        total: number;
        done: number;
        pending: number;
        failed: number;
    };
}>>;
export declare const getBranding: import("vitest").Mock<() => Promise<null>>;
export declare const getAgenceCriteres: import("vitest").Mock<() => Promise<never[]>>;
export declare const getAgents: import("vitest").Mock<() => Promise<never[]>>;
export declare const getAgentsByAgence: import("vitest").Mock<() => Promise<never[]>>;
export declare const getAlertes: import("vitest").Mock<() => Promise<never[]>>;
export declare const getTachesCorrectives: import("vitest").Mock<() => Promise<never[]>>;
export declare const getAffectationsDuJour: import("vitest").Mock<() => Promise<never[]>>;
export declare const getModelesHoraires: import("vitest").Mock<() => Promise<never[]>>;
export declare const getTacheHistorique: import("vitest").Mock<() => Promise<never[]>>;
export declare const getRadarStats: import("vitest").Mock<() => Promise<never[]>>;
export declare const getTendanceMensuelle: import("vitest").Mock<() => Promise<never[]>>;
export declare const getStatsByAgent: import("vitest").Mock<() => Promise<never[]>>;
export declare const getStatsByGuichet: import("vitest").Mock<() => Promise<never[]>>;
export declare const getActionsPrioritaires: import("vitest").Mock<() => Promise<{
    alertesNouvelles: never[];
    tachesEnRetard: never[];
}>>;
export declare const getKPIsPeriode: import("vitest").Mock<() => Promise<{
    nb_jours: number;
    periode_actuelle: {
        nb: number;
        moyenne: number;
        satisfaction: number;
    };
    periode_precedente: {
        nb: number;
        moyenne: number;
        satisfaction: number;
    };
    delta_satisfaction_pts: number;
    delta_note_pts: number;
    delta_volume_pct: number;
    par_operation: never[];
}>>;
export declare const getObjectifs: import("vitest").Mock<() => Promise<never[]>>;
export declare const getHeatmapReponses: import("vitest").Mock<() => Promise<null>>;
export declare const getComparaisonAgences: import("vitest").Mock<() => Promise<{
    nb_jours: number;
    agences: never[];
    meilleure_agence: null;
    agence_a_surveiller: null;
    moyenne_globale: null;
}>>;
export declare const getTempsTraitement: import("vitest").Mock<() => Promise<{
    nb_jours: number;
    prise_en_charge: {
        moyenne_heures: number;
        nb: number;
        delta_heures: number;
    };
    resolution: {
        moyenne_heures: number;
        nb: number;
        delta_heures: number;
    };
}>>;
export declare const getThemesStats: import("vitest").Mock<() => Promise<{
    total: number;
    topThemes: never[];
}>>;
export declare const getIndicateursExperience: import("vitest").Mock<() => Promise<null>>;
export declare const getReponses: import("vitest").Mock<() => Promise<never[]>>;
export declare const logout: import("vitest").Mock<() => Promise<undefined>>;
