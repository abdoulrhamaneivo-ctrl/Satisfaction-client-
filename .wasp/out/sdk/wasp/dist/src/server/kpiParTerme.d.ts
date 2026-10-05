import { type AgregationNPS } from '../shared/scoringEngine';
import { type AgregationCES, type EchelleCES } from '../shared/ces';
/** Seuil de significativité : en dessous, les métriques valent null. */
export declare const SEUIL_KPI_N = 5;
/** Fenêtre glissante en jours : défaut 30, bornée [1,90]. */
export declare const NB_JOURS_DEFAUT = 30;
export declare const NB_JOURS_MIN = 1;
export declare const NB_JOURS_MAX = 90;
/** Fenêtre de tendance en mois : défaut 12, bornée [1,24]. */
export declare const NB_MOIS_DEFAUT = 12;
export declare const NB_MOIS_MIN = 1;
export declare const NB_MOIS_MAX = 24;
export declare function normaliserNbJours(valeur: unknown, defaut?: number): number;
export declare function normaliserNbMois(valeur: unknown, defaut?: number): number;
export type ConfigCritereLue = {
    type_reponse?: string | null;
    scoring_mode?: string | null;
    options_reponse?: string | null;
};
export type LigneKpi = {
    id: number | string | bigint;
    id_soumission?: string | null;
    score_normalise?: number | null;
    score_brut?: number | null;
    score_officiel?: number | null;
    date_reponse?: Date | string | null;
    critere?: ConfigCritereLue | null;
};
export type KindCritere = 'SATISFACTION' | 'NPS' | 'CES' | 'CATEGORIEL' | 'TEXTE';
/**
 * Famille d'indicateur d'un critère : NPS et CES ont leurs métriques
 * dédiées (jamais moyennés avec la satisfaction), TEXTE et choix
 * catégoriels (QCM/CASES non valencés) ne portent que des répartitions.
 */
export declare function classifierCritere(critere: ConfigCritereLue | null | undefined): KindCritere;
/**
 * Note /5 depuis le SEUL `score_normalise` (/100 → /5, bornée [1,5]).
 * `score_brut` n'est JAMAIS lu (pas de repli) ; les critères hors
 * satisfaction (TEXTE, QCM/CASES, NPS, CES) rendent null.
 */
export declare function noteDepuisNormalise(ligne: Pick<LigneKpi, 'score_normalise' | 'critere'>): number | null;
/** Avis distincts : même `id_soumission` = 1 avis ; orphelines = 1 chacune. */
export declare function clesAvis<T extends Pick<LigneKpi, 'id' | 'id_soumission'>>(lignes: T[]): Set<string>;
export declare function compterAvis<T extends Pick<LigneKpi, 'id' | 'id_soumission'>>(lignes: T[]): number;
export type Distribution5 = {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
};
export declare function distributionVide(): Distribution5;
export type AgregatCritere = {
    /** Avis distincts ayant répondu à ce critère (toutes lignes). */
    nb_avis: number;
    /** Lignes notables (satisfaction + score_normalise fini). */
    nb_notables: number;
    /** Moyenne /5 (2 décimales), null si non-satisfaction ou n<5. */
    moyenne_sur5: number | null;
    /** % d'avis >= 4/5 (1 décimale), null si non-satisfaction ou n<5. */
    satisfaction_pct: number | null;
    /** Effectifs par bande (toujours renseignés, même sous le seuil). */
    distribution: Distribution5;
};
/**
 * Agrège les lignes d'UN critère : seules les notes de satisfaction
 * (noteDepuisNormalise non-null) entrent dans la moyenne. Le seuil porte
 * sur `nb_notables` (la base réelle de la moyenne, pas le volume brut).
 */
export declare function agregerLignesCritere(lignes: LigneKpi[]): AgregatCritere;
export type SelectionOptions = {
    id: number | string | bigint;
    id_soumission?: string | null;
    /** Ids d'options cochées par cet avis pour le critère. */
    options: string[];
};
export type LigneRepartition = {
    option_id: string;
    libelle: string;
    /** Avis distincts ayant coché cette option. */
    nb: number;
    /** % des avis ayant coché (1 décimale), null si nb_avis < 5. */
    pct: number | null;
};
export type RepartitionOptions = {
    /** Avis distincts ayant répondu au critère (dénominateur unique). */
    nb_avis: number;
    options: LigneRepartition[];
};
/**
 * Répartition des choix : le dénominateur est le nombre d'AVIS distincts
 * (pas le nombre de coches — un avis CASES multi-choix compte 1). Les
 * pourcentages peuvent donc dépasser 100 au total en CASES : c'est la
 * part d'avis cochant chaque option, documentée comme telle.
 */
export declare function repartirOptionsParAvis(selections: SelectionOptions[], optionsRef: {
    id: string;
    libelle: string;
}[]): RepartitionOptions;
/**
 * Reconnaît un critère CES et son échelle depuis la configuration stockée
 * (`options_reponse` au format CSV "min,max", ex. "1,5"). Renvoie null si
 * le critère n'est pas un CES ou si l'échelle n'est pas supportée —
 * l'appelant ignore alors la ligne (jamais d'estimation).
 */
export declare function reconnaitreEchelleCES(c: ConfigCritereLue | null | undefined): EchelleCES | null;
/**
 * Agrège les lignes CES d'un critère (notes brutes `score_officiel`,
 * échelle explicite). null si volume < 5 ou aucune note valide.
 */
export declare function agregerLignesCES(lignes: LigneKpi[], echelle: EchelleCES): AgregationCES | null;
export type PointTendance = {
    cle: string;
    libelle: string;
    /** Avis notables satisfaction du mois (base de la moyenne). */
    nb_avis: number;
    moyenne_sur5: number | null;
    /** NPS du mois (%promoteurs − %détracteurs), null si volume < 5. */
    nps: number | null;
    nps_detail: Pick<AgregationNPS, 'volume' | 'promoteurs' | 'passifs' | 'detracteurs'>;
};
/** Clé mensuelle calendaire 'YYYY-MM' (mois local du serveur). */
export declare function cleMois(d: Date): string;
/** Libellé court FR ('août 26') — même convention que getTendanceMensuelle. */
export declare function libelleMois(cle: string): string;
/** Clés des `nb` derniers mois calendaires, du plus ancien au courant inclus. */
export declare function moisGlissants(nb: number, ref?: Date): string[];
/**
 * Tendance mensuelle sur des clés calendaires explicites : moyenne de
 * satisfaction par mois (seuil n>=5 par point) + série NPS mensuelle
 * (agregerNPS sur `score_officiel`, jamais une moyenne de notes).
 * `nb_avis` = avis notables satisfaction (base de la moyenne affichée).
 */
export declare function construireTendance(lignes: LigneKpi[], cles: string[]): PointTendance[];
//# sourceMappingURL=kpiParTerme.d.ts.map