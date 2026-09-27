export declare const getAnalysesGlobales: (args: {
    periode?: "SEMAINE" | "MOIS" | "PERSONNALISEE";
} | void, context: any) => Promise<any>;
export declare const declencherAnalyseGlobale: (args: {
    periode: "SEMAINE" | "MOIS" | "PERSONNALISEE";
    date?: string;
    debut?: string;
    fin?: string;
}, context: any) => Promise<{
    id: string;
    status: any;
    dejaExistante: boolean;
}>;
//# sourceMappingURL=globalExperience.d.ts.map