export declare const getAnalysesGlobales: (args: {
    periode?: "SEMAINE" | "MOIS";
} | void, context: any) => Promise<any>;
export declare const declencherAnalyseGlobale: (args: {
    periode: "SEMAINE" | "MOIS";
    date?: string;
}, context: any) => Promise<{
    id: string;
    status: any;
    dejaExistante: boolean;
}>;
//# sourceMappingURL=globalExperience.d.ts.map