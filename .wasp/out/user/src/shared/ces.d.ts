export type EchelleCES = 5 | 7;
export type BandeCES = 'FAIBLE_EFFORT' | 'EFFORT_MOYEN' | 'EFFORT_ELEVE';
export type BandeCESDef = {
    id: BandeCES;
    label: string;
    /** Bornes incluses sur l'échelle d'effort brute. */
    min: number;
    max: number;
};
/** Échelles valides (borne min toujours 1). */
export declare const ECHELLES_CES: EchelleCES[];
/**
 * Bandes d'effort — découpage ARBITRAIRE MAIS FIGÉ (convention de mesure) :
 * - 1-5 : 1-2 faible, 3 moyen, 4-5 élevé ;
 * - 1-7 : 1-3 faible, 4-5 moyen, 6-7 élevé.
 * Les effectifs de chaque bande sont toujours rapportés au volume total
 * (dénominateur = n(CES), jamais n(global)).
 */
export declare const BANDES_CES: Record<EchelleCES, BandeCESDef[]>;
/** Libellés de bandes par défaut pour un libellé d'échelle. */
export declare const LIBELLES_ECHELLE_CES: Record<EchelleCES, string[]>;
export declare function estEchelleCES(v: number): v is EchelleCES;
/** Bande d'une note d'effort brute. Hors bornes → null (jamais de bande inventée). */
export declare function bandeCES(note: number, echelle: EchelleCES): BandeCES | null;
/**
 * Top box « faible effort » = meilleur tiers bas de l'échelle :
 * 1-2 sur 5, 1-3 sur 7. Hors bornes → false (une note invalide ne fait
 * jamais monter le taux).
 */
export declare function topBoxCES(note: number, echelle: EchelleCES): boolean;
/**
 * Note d'effort → score canonique /100 « qualité perçue » (effort bas = 100).
 * Fonction de ST_RANK (identique à `echelleVers100(..., LOWER_BETTER)`)
 * mais bornée aux seuls CES : aucun administrateur ne peut inverser le sens.
 */
export declare function scoreEffort100(note: number, echelle: EchelleCES): number | null;
export type AgregationCES = {
    /** Volume de réponses CES valides (dénominateur unique). */
    volume: number;
    echelle: EchelleCES;
    faible_effort: number;
    effort_moyen: number;
    effort_eleve: number;
    taux_faible_effort: number;
    taux_effort_moyen: number;
    taux_effort_eleve: number;
    /** % top box (meilleur tiers bas) — identique à taux_faible_effort,
     * exposé séparément car c'est l'indicateur le plus utilisé en interne. */
    top_box: number;
    /** Score canonique /100 moyen (qualité perçue, effort bas = 100). */
    score_qualite_100: number | null;
    /** Note d'effort brute moyenne (1..échelle) — lisible par un humain. */
    note_effort_moyenne: number | null;
    /** Répartition par note brute, dans l'ordre de l'échelle. */
    repartition: Record<string, number>;
};
/** Volume vide → agrégats à zéro + métriques à null (jamais 0 %). */
export declare function agregerCES(notes: number[], echelle: EchelleCES): AgregationCES;
/**
 * Détecte un critère CES et son échelle à partir de la configuration stockée
 * (min/max de l'échelle). Renvoie null si le critère n'est pas un CES ou si
 * l'échelle n'est pas supportée — l'appelant décide alors d'ignorer la ligne
 * (jamais d'estimation).
 */
export declare function reconnaitreCES(c: {
    scoring_mode?: string | null;
    type_reponse?: string | null;
    echelle_min?: number | null;
    echelle_max?: number | null;
}): EchelleCES | null;
