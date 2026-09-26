export type EntreeBrute = {
    critereId: number;
    score?: number;
    texte?: string;
    optionId?: string;
    optionIds?: string[];
    valeur?: number;
    valeurOui?: boolean;
};
export type ItemResolu = {
    critereId: number;
    texte?: string;
    libelleOption?: string;
    score_brut: number | null;
    score_officiel: number | null;
    score_normalise: number | null;
    score_source: string | null;
    critere_version: number;
    optionsRetnues: string[];
};
/** Normalise une entrée brute (bornes anti-abus, trim, plafonds). */
export declare function normaliserEntree(r: any): EntreeBrute;
export declare function messageAmbigu(raison: string | undefined, type: string): string;
/**
 * Résout UNE entrée contre sa ligne Critere (avec `options` et `version`).
 * Lève HttpError 400 si irrésolvable. Ne touche jamais à la base.
 */
export declare function resoudreEntree(critere: any, entree: EntreeBrute): ItemResolu;
