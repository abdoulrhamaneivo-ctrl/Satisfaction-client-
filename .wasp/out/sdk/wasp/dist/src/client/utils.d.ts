import { type ClassValue } from "clsx";
export declare function cn(...inputs: ClassValue[]): string;
export declare function regrouperAvisParSoumission<T extends {
    id: any;
    id_soumission?: string | null;
    score_brut: number;
}>(reponses: T[]): {
    id_soumission: string | null;
    reponses: T[];
    score_moyen: number;
}[];
export declare function formatNumber(number: number): string | undefined;
//# sourceMappingURL=utils.d.ts.map