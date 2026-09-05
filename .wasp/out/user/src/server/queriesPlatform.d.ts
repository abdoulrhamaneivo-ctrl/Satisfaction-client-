export declare const getPlatformOverview: (_args: void, context: any) => Promise<{
    entreprises_total: any;
    entreprises_actives: number;
    entreprises_suspendues: number;
    utilisateurs: any;
    avis_collectes: any;
    evolution: {
        mois: string;
        count: number;
    }[];
    recentes: any;
}>;
export declare const getPlatformEntreprises: (args: {
    search?: string;
    status?: string;
    plan?: string;
    cursor?: number;
}, context: any) => Promise<{
    entreprises: any;
    hasMore: boolean;
    nextCursor: any;
}>;
export declare const getPlatformEntreprise: (args: {
    id: number;
}, context: any) => Promise<any>;
export declare const getPlatformAudit: (args: {
    entreprise_id?: number;
    action?: string;
    cursor?: number;
}, context: any) => Promise<{
    logs: any;
    hasMore: boolean;
    nextCursor: any;
}>;
export declare const getPlatformMe: (_args: void, context: any) => Promise<{
    platformRole: any;
    email: any;
    nom: any;
    prenom: any;
    totp_actif: boolean;
}>;
