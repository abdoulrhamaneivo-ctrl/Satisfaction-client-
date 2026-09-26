export type OptionForm = {
    /** Clé locale stable (jamais l'id base : les nouvelles n'en ont pas). */
    cle: string;
    libelle: string;
    /** null = Auto (inférence lexicale, provenance INFERRED). */
    score: number | null;
    /** null = pas de pondération. */
    poids: number | null;
    code_metier: string;
};
export declare function nouvelleCleOption(): string;
export declare function optionVide(): OptionForm;
/** CSV legacy → lignes éditables (migration douce vers l'éditeur). */
export declare function csvVersOptions(csv: string): OptionForm[];
/** Lignes existantes (base) → lignes éditables. */
export declare function baseVersOptions(lignes: any[]): OptionForm[];
/** Lignes → payload createCritere/updateCritere (vides filtrées). */
export declare function optionsVersPayload(options: OptionForm[]): Array<{
    libelle: string;
    score: number | null;
    poids: number | null;
    code_metier?: string;
}>;
