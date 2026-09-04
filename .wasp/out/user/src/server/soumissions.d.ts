export type ReponseAvecSoumission = {
    id: number | string | bigint;
    id_soumission?: string | null;
    score_brut: number;
    critere?: {
        type_reponse?: string | null;
        options_reponse?: string | null;
    } | null;
    commentaire_texte?: string | null;
    [key: string]: any;
};
export type GroupeAvis<T> = {
    /** Clé de regroupement : id_soumission réel, ou clé synthétique si absent */
    cle: string;
    /** Vrai UUID de soumission, ou null si avis "legacy" sans regroupement */
    id_soumission: string | null;
    reponses: T[];
};
/**
 * Regroupe une liste de lignes Reponse en avis distincts.
 * Conserve l'ordre de première apparition.
 */
export declare function regrouperParSoumission<T extends ReponseAvecSoumission>(reponses: T[]): GroupeAvis<T>[];
/**
 * Concatène les commentaires distincts d'une soumission en un seul texte
 * lisible. Depuis que chaque ligne Reponse peut porter son propre texte
 * (réponse à un critère de type TEXTE, en plus du commentaire final libre),
 * ne garder que celui de la première ligne du groupe en perdait une partie —
 * ex. le commentaire final de l'étape "Message ou suggestion" s'il n'était
 * pas répondu au premier critère du formulaire.
 */
export declare function commentairesDeGroupe<T extends ReponseAvecSoumission>(groupe: T[]): string;
export declare function compterAvis<T extends ReponseAvecSoumission>(reponses: T[]): number;
/**
 * Ramène les réponses quantitatives sur une échelle commune de 1 à 5.
 * Les réponses de collecte libre ne sont pas des mesures de satisfaction :
 * les inclure dans une moyenne créerait un score artificiel.
 */
export declare function scoreNormaliseSur5(reponse: ReponseAvecSoumission): number | null;
/**
 * Score moyen PAR AVIS : chaque soumission compte pour 1, quel que soit son
 * nombre de critères (une soumission à 5 critères ne doit pas peser 5x plus
 * qu'une soumission à 1 critère dans une moyenne globale).
 */
export declare function scoreMoyenParAvis<T extends ReponseAvecSoumission>(reponses: T[]): number[];
