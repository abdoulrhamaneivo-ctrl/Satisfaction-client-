/** Options QCM/CASES : choix séparés par des virgules (convention existante). */
export declare function parseOptionsCSV(brut: string | null | undefined): string[];
/** Scores explicites parallèles aux options. null = absents/invalides. */
export declare function parseScoresCSV(brut: string | null | undefined): number[] | null;
/**
 * Normalisation d'un libellé pour comparaison : minuscules, sans accents,
 * espaces repliés. « Très Satisfait » ≡ « tres satisfait ».
 */
export declare function normaliserLibelle(s: string): string;
/**
 * Infère le score sémantique (1 = pire … 5 = meilleur) d'UN libellé d'option.
 * Retourne null si le libellé ne porte aucune valence identifiable
 * (ex. CASES « motifs » : « Accueil,Guichet 3 » → non scorable).
 */
export declare function infererScoreOption(option: string): number | null;
/** Infère le score de chaque option. null = valence inconnue. */
export declare function infererScoresOptions(options: string[]): (number | null)[];
export type CritereScorable = {
    options_reponse?: string | null;
    scores_reponse?: string | null;
};
/**
 * Scores effectifs d'un critère QCM/CASES, dans l'ordre des options.
 * Priorité : scores stockés (`scores_reponse`, validés : même cardinalité
 * que les options, entiers 1-5) PUIS inférence lexicale.
 * Retourne null si une option au moins n'est pas scorable — le critère
 * reste alors NON NOTÉ (comportement historique : exclu des moyennes).
 */
export declare function scoresEffectifsPourCritere(critere: CritereScorable | null | undefined): number[] | null;
/**
 * Valide des scores explicites fournis avec les options.
 * Retourne la forme CSV normalisée (« 5,3,1 »). Lance Error sinon.
 */
export declare function validerScoresExplicites(optionsBrut: string, scoresBrut: string | null | undefined): string;
/**
 * Construit la valeur à STOCKER dans `scores_reponse` à la création/édition :
 * scores explicites validés s'ils sont fournis, sinon inférence lexicale.
 * Retourne null si le critère n'est pas scorable (stockage null = exclu).
 */
export declare function construireScoresAStocker(optionsBrut: string, scoresBrut?: string | null): string | null;
