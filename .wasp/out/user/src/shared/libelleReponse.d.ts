/** Forme minimale d'une réponse affichable (aucune dépendance Prisma). */
export type ReponseAffichable = {
    score_brut?: number | null;
    score_officiel?: number | null;
    score_normalise?: number | null;
    commentaire_texte?: string | null;
    critere?: {
        type_reponse?: string | null;
        libelle_critere?: string | null;
        orientation?: string | null;
        scoring_mode?: string | null;
        options_reponse?: string | null;
    } | null;
    /** Options réellement choisies (jointure `ReponseOption`). */
    optionsChoisies?: {
        option?: {
            libelle?: string | null;
        } | null;
    }[] | null;
};
/** Libellés des options choisies, dans l'ordre de la jointure. */
export declare function libellesOptionsChoisis(r: ReponseAffichable): string[];
/** Bornes d'une échelle stockée dans `options_reponse` (`"1,10"`). */
export declare function borneEchelle(critere: ReponseAffichable['critere']): {
    min: number;
    max: number;
} | null;
/**
 * Oui/Non : le 5 et le 1 stockés sont un ENCODAGE de polarité, pas une note.
 * L'orientation du critère décide donc du sens — c'est ce qui affichait
 * « Non » pour un « Oui » sur une question du type « Avez-vous rencontré un
 * problème ? » (orientation LOWER_BETTER).
 */
export declare function libelleOuiNon(r: ReponseAffichable): 'Oui' | 'Non' | null;
/**
 * Polarité de l'expérience, pour l'icône (pas pour le texte affiché).
 * Le résolveur stocke déjà la positivité : `positif → 5`, `négatif → 1`
 * (`scoringEngine.ts:218-223`), quelle que soit l'orientation. L'orientation ne
 * sert qu'à retrouver la RÉPONSE (« Oui » / « Non »), pas la polarité.
 */
export declare function reponseEstPositive(r: ReponseAffichable): boolean | null;
/** Valeur d'échelle rendue en clair : `7/7 · Très difficile` pour un CES. */
export declare function libelleEchelle(r: ReponseAffichable): string | null;
/**
 * Réponse en clair, sans le libellé du critère (les appelants le préfixent).
 * `null` = rien de restituable → l'appelant affiche « — » plutôt qu'inventer.
 */
export declare function reponseEnClair(r: ReponseAffichable, options?: {
    texteGroupe?: string | null;
}): string | null;
/** Rendu complet « Critère : valeur », prêt pour un export ou une liste. */
export declare function decrireReponse(r: ReponseAffichable, options?: {
    texteGroupe?: string | null;
    prefixeCritere?: boolean;
}): string;
