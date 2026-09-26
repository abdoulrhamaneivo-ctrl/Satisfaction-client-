import { type AgregationNPS } from '../../shared/scoringEngine';
import { type AgregationCES } from '../../shared/ces';
export interface PerimetreGlobal {
    id_entreprise: number;
    debut: Date;
    fin: Date;
    /** Restreint aux agences listées (vue chef d'agence). Défaut : tout le réseau. */
    idsAgences?: number[];
}
export type LigneAgence = {
    id: number;
    nom: string;
    volume: number;
    csat: number | null;
};
export type ThemeCompte = {
    theme: string;
    count: number;
};
export type ThemeDetail = ThemeCompte & {
    severiteMax: string;
    agencesDistinctes: number;
};
export type AgregatsGlobaux = {
    volumeAvis: number;
    volumeNotables: number;
    volumeCommentaires: number;
    csat: number | null;
    distribution5: Record<string, number>;
    nps: AgregationNPS | null;
    /** Phase L : effort perçu. null = aucune question CES dans le périmètre. */
    ces: AgregationCES | null;
    sentiments: Record<string, number>;
    totalAnalyses: number;
    incoherents: number;
    tauxIncoherence: number;
    themesTop: ThemeCompte[];
    /** Détail par thème (sévérité max + étendue) pour la priorisation. */
    themesDetail: ThemeDetail[];
    /** Fréquences de la période précédente (évolution par irritant). */
    themesTopPrev: ThemeCompte[];
    totalAnalysesPrev: number;
    parAgence: LigneAgence[];
    parService: {
        id: number | null;
        nom: string;
        volume: number;
        csat: number | null;
    }[];
    guichetsTop: {
        id: number;
        nom: string;
        volume: number;
        csat: number | null;
    }[];
    guichetsFlop: {
        id: number;
        nom: string;
        volume: number;
        csat: number | null;
    }[];
    evolutionVolumePct: number | null;
    evolutionCsatPts: number | null;
    /** Score de qualité des données /100 — voir `qualiteDonneesDetails`. */
    qualiteDonnees: number;
    /**
     * Décomposition de la qualité, en points /100 par composante.
     * Vague 6 : exposer le détail permet de répondre à « pourquoi 62 ? »
     * sans deviner la formule — c'est tout l'intérêt de DATA_QUALITY_SCORE.
     */
    qualiteDonneesDetails: {
        notables: number;
        commentaires: number;
        coherence: number;
        fraicheur_legacy: number;
        volume: number;
    };
    confiance: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
};
/** Confiance globale (pure) : volume + qualité + cohérence. */
export declare function niveauConfianceGlobal(volumeAvis: number, qualiteDonnees: number, tauxIncoherence: number): 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
export interface EntreeIrritant {
    theme: string;
    count: number;
    total: number;
    severiteMax: string;
    frequencePrecedente: number;
    agencesDistinctes: number;
    nbAgences: number;
    confiance: number;
}
export interface IrritantPriorise extends EntreeIrritant {
    frequence: number;
    gravite: number;
    evolution: number;
    etendue: number;
    priorite: number;
}
/**
 * Recale les irritants verbalisés par le modèle sur les mesures réelles
 * (Vague 5, P10).
 *
 * Le modèle reçoit une liste d'irritants DÉTERMINISTES et la commente. Il
 * peut toutefois en formuler un dont la donnée ne dit rien — un thème
 * absent des mesures, donc sans fréquence, sans gravité, sans étendue.
 *
 * Le code précédent gardait la priorité du modèle dans ce cas :
 *
 *     priorite: deterministe(theme) ?? i.priorite
 *
 * Une valeur « plausible » entre 0 et 100 se retrouvait donc affichée à
 * la direction avec l'apparence d'une mesure. Le repli rendait
 * l'invention invisible : impossible de distinguer une priorité calculée
 * d'une priorité inventée, même en relisant le code.
 *
 * Ici on SUPPRIME ce qui n'est pas mesuré. Un irritant absent des
 * données n'a pas de priorité, donc il n'est pas affiché. Le modèle
 * verbalise, il ne mesure pas.
 *
 * @returns les irritants retenus, priorité réécrite, et le nombre écarté.
 */
export declare function recalerIrritantsSurMesures<T extends {
    theme: string;
    priorite: number;
}>(irritantsDuModele: T[], mesures: Pick<IrritantPriorise, 'theme' | 'priorite'>[]): {
    retenus: T[];
    ecarte: number;
};
/**
 * Priorité opérationnelle DÉTERMINISTE (documentée, §28) :
 *   priorite = frequence × gravite × (1 + |evolution|) × etendue × confiance × 100
 * Jamais présentée comme mesure universelle : indicateur interne.
 */
export declare function prioriserIrritants(entrees: EntreeIrritant[]): IrritantPriorise[];
/** Calcule les agrégats déterministes d'un périmètre (requêtes scopées tenant). */
export declare function calculerAgregats(db: any, p: PerimetreGlobal): Promise<AgregatsGlobaux>;
/**
 * Dernière semaine COMPLÈTE (lundi 00:00 → dimanche 23:59:59.999) avant la
 * semaine contenant `ref`. Jamais la semaine en cours (données partelles).
 */
export declare function derniereSemaineComplete(ref?: Date): {
    debut: Date;
    fin: Date;
};
/** Mois calendaire COMPLET précédent (jamais le mois en cours). */
export declare function moisPrecedent(ref?: Date): {
    debut: Date;
    fin: Date;
};
/** Semaine (lun-dim) CONTENANT une date — déclenchement manuel uniquement. */
export declare function semaineContenant(ref: Date): {
    debut: Date;
    fin: Date;
};
/** Mois calendaire CONTENANT une date — déclenchement manuel uniquement. */
export declare function moisContenant(ref: Date): {
    debut: Date;
    fin: Date;
};
/** Prompt LLM déterministe : même entrée → même chaîne (testé). */
export declare function construirePromptSynthese(entrepriseNom: string, periodeLabel: string, a: AgregatsGlobaux, irritants: ReturnType<typeof prioriserIrritants>): string;
//# sourceMappingURL=moteurGlobal.d.ts.map