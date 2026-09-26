export declare const SEUIL_MIN_AVIS = 10;
export declare function analyserGlobaleJob(_args: any, _context: any): Promise<{
    status: string;
    entreprises: number;
    budget: number;
    traitees: number;
    budgetAtteint: boolean;
    enAttente: number;
}>;
