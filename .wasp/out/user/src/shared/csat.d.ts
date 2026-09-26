/** Ligne minimale nécessaire au calcul. */
export interface ReponseCalculable {
    id_soumission?: string | null;
    score_normalise?: number | null;
    critere?: {
        type_reponse?: string | null;
        scoring_mode?: string | null;
    } | null;
}
/** Sépare les lignes orphelines (sans `id_soumission`) : chacune son avis. */
export declare function grouperParAvis<T extends ReponseCalculable>(lignes: T[]): T[][];
/** Nombre d'avis distincts (soumissions + orphelines). */
export declare function compterAvisDans<T extends ReponseCalculable>(lignes: T[]): number;
/**
 * Facteur de conversion : `noteSur5` rend une note sur 5, l'indicateur
 * CSAT est exprimé sur 100.
 *
 * Nommer la constante évite la confusion la plus probable sur ce fichier :
 * un `* 100` au lieu d'un `* 20` produit un CSAT de 400 chez un client
 * qui a mis 4/5 — invisible en recette, immediately visible en
 * production.
 */
export declare const FACTEUR_NOTE5_VERS_100 = 20;
/**
 * Score de satisfaction d'un avis, sur 100 (moyenne de ses lignes
 * notables). `null` si l'avis n'a aucune note de satisfaction
 * exploitable.
 */
export declare function scoreAvis100<T extends ReponseCalculable>(lignes: T[]): number | null;
/**
 * CSAT : moyenne des scores PAR AVIS, sur /100.
 *
 * @param reponses lignes du périmètre (toutes familles de critères)
 * @returns le score /100, ou `null` si aucune note de satisfaction
 */
export declare function csatParAvis<T extends ReponseCalculable>(reponses: T[]): number | null;
/**
 * Score de chaque avis, sur 100 — la brique de base.
 *
 * Une ventilation (agence, service, guichet) et le CSAT global doivent
 * moyenner EXACTEMENT la même liste. Exposer la liste, et pas seulement
 * sa moyenne, évite qu'une ventilation refasse sa propre moyenne : c'est
 * ainsi que les deux avaient fini par diverger.
 */
export declare function scoresAvisSatisfaction<T extends ReponseCalculable>(reponses: T[]): number[];
/**
 * Répartition des avis par bande /5, pour l'histogramme du dashboard.
 * Chaque avis compte une fois : la bande est celle de son score moyen.
 */
export declare function distributionParAvis<T extends ReponseCalculable>(reponses: T[]): Record<string, number>;
