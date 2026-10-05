export type EntreeBrute = {
    critereId: number;
    score?: number;
    texte?: string;
    optionId?: string;
    optionIds?: string[];
    valeur?: number;
    valeurOui?: boolean;
    /** Verbatim de l'option « Autre (précisez) » (Task 2, déjà nettoyé). */
    autreTexte?: string;
};
/**
 * Task 2 — Marqueur du verbatim Autre dans ItemResolu.texte.
 * `construireLigne` (actions.ts) le convertit en `Autre — "verbatim"`
 * pour commentaire_texte ; le score reste NON_NOTABLE.
 */
export declare const PREFIXE_AUTRE = "AUTRE::";
/** `Autre — "verbatim"` : forme stockée (commentaire_texte) et envoyée à l'IA. */
export declare function formaterAutreStockage(verbatim: string): string;
/**
 * Review r1 (F5) — combine un libellé chiffrable et un texte `AUTRE::…`
 * en réponse affichable (`base • Autre — "v"`), ou `null` sans verbatim.
 * Factorise `construireLigne` et `morceauxIA` (actions.ts) : un seul
 * endroit connaît le marqueur interne.
 */
export declare function formaterReponseAutre(libelleOption: string | null | undefined, texte: string | null | undefined): string | null;
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
//# sourceMappingURL=resolutionSoumission.d.ts.map