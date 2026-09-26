export type ReponseCollecte = {
    critereId: number;
    score?: number;
    texte?: string;
    optionId?: string;
    optionIds?: string[];
    valeur?: number;
    valeurOui?: boolean;
};
/** Option telle qu'exposée par getFormDefinitionForGuichet (id stable). */
export type OptionAffichage = {
    id: string | null;
    libelle: string;
};
/**
 * Options à afficher pour un critère : table OptionCritere (ids stables)
 * en priorité, repli CSV legacy (sans id → le serveur apparie par libellé,
 * stampé MIGRATED).
 */
export declare function optionsAffichage(critere: any): OptionAffichage[];
/** Smiley 1-5 (échelle fixe, aucun biais de position possible). */
export declare function payloadSmiley(critereId: number, note: number): ReponseCollecte;
/** Oui/Non : booléen + orientation gérée serveur. */
export declare function payloadOuiNon(critereId: number, oui: boolean): ReponseCollecte;
/** QCM : optionId si connu, sinon libellé (compat serveur MIGRATED). */
export declare function payloadQCM(critereId: number, choix: OptionAffichage): ReponseCollecte;
/** Texte libre : verbatim seul, jamais de note. */
export declare function payloadTexte(critereId: number, texte: string): ReponseCollecte;
/** Échelle / NPS : valeur brute (bornes validées serveur). */
export declare function payloadValeur(critereId: number, valeur: number): ReponseCollecte;
/** CASES : ids si connus, sinon libellés joints (compat serveur). */
export declare function payloadCases(critereId: number, choix: OptionAffichage[]): ReponseCollecte;
/** Échelle : bornes depuis options_reponse (défaut 1-5, miroir serveur). */
export declare function bornesEchelle(critere: any): {
    min: number;
    max: number;
};
/** Un critère est-il une question d'effort ? (miroir de reconaîtreCES). */
export declare function estCritereCES(critere: any): boolean;
/**
 * Libellés d'une échelle CES, du mieux (1 = très facile) au pire
 * (max = très difficile). LeMapping 1-7 double volontairement deux
 * intervalles neutres (2 et 3 « Très facile », 4 et 5 « Plutôt facile »,
 * 6 « Plutôt difficile ») : c'est la convention de mesure du CES, pas
 * une approximation. Sur 1-5, chaque niveau a son libellé.
 *
 * Un CES mal configuré (autre échelle) retombe sur les chiffres bruts :
 * on n'invente jamais un libellé.
 */
export declare function libellesCES(max: number): string[];
export type ChoixEchelle = {
    valeur: number;
    /** Texte affiché sur le bouton (libellé CES ou chiffre). */
    libelle: string;
    /** Libellé vocalisé (accessibilité) : « Effort : Très facile ». */
    aria: string;
};
/**
 * Boutons d'une question d'échelle : libellés d'effort pour un CES,
 * chiffres pour une note classique. La valeur TRANSMISE reste toujours la
 * note brute (le serveur, seul, décide du score).
 */
export declare function choixEchelle(critere: any): ChoixEchelle[];
