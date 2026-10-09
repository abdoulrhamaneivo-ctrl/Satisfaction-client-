type GetGuichetsArgs = {
    id_agence?: number;
};
export declare const getGuichets: (args: GetGuichetsArgs, context: any) => Promise<any>;
export declare const getAgents: (args: {
    id_agence: number;
}, context: any) => Promise<any>;
export declare const getStatsFiltrees: (args: {
    startDate: string;
    endDate: string;
}, context: any) => Promise<any>;
type GetReponsesArgs = {
    id_agence?: number;
    id_guichet?: number;
    id_service?: number;
    score?: number;
    startDate?: string;
    endDate?: string;
};
export declare const getReponses: (args: GetReponsesArgs, context: any) => Promise<any>;
type GetAvisGroupesArgs = GetReponsesArgs & {
    page?: number;
    pageSize?: number;
    theme?: string;
};
export declare const getAvisGroupes: (args: GetAvisGroupesArgs, context: any) => Promise<{
    avis: {
        id_soumission: string;
        date_reponse: any;
        commentaire_texte: string;
        id_canal: any;
        guichet: any;
        service: any;
        agence: any;
        agent: any;
        score_min: number | null;
        score_moyen: number | null;
        analyseIA: any;
        reponses: {
            id: any;
            score_brut: any;
            score_normalise: any;
            score_officiel: any;
            optionsChoisies: any;
            commentaire_texte: any;
            critere: any;
            analyseIA: any;
        }[];
    }[];
    total: any;
    hasMore: boolean;
    page: number;
    pageSize: number;
}>;
/** Contact de rappel déchiffré à la demande, uniquement pour le chef de l'agence. */
export declare const getContactRappel: (args: {
    id_soumission?: string;
}, context: any) => Promise<{
    telephone: null;
    processedAt: any;
    createdAt: any;
} | {
    telephone: string;
    processedAt: null;
    createdAt: any;
} | null>;
export declare const exportAvisGroupes: (args: GetReponsesArgs & {
    curseurId?: number;
}, context: any) => Promise<{
    lignes: {
        id_soumission: string;
        date_reponse: any;
        guichet: any;
        agence: any;
        service: any;
        agent: string;
        score_moyen: number | null;
        commentaire: string;
        criteres: string;
    }[];
    curseurSuivant: number | null;
}>;
export declare const getAgentsByAgence: (args: {
    id_agence: number;
}, context: any) => Promise<any>;
export declare const getAgences: (_args: void, context: any) => Promise<any>;
export declare const getAlertes: (_args: void, context: any) => Promise<any>;
export declare const getCriteres: (_args: void, context: any) => Promise<any>;
export declare const getAgenceCriteres: (args: {
    id_agence?: number;
}, context: any) => Promise<any>;
export declare const getServices: (_args: void, context: any) => Promise<any>;
export declare const getFormDefinitionForGuichet: (args: {
    code_public?: string;
}, context: any) => Promise<{
    guichetName: any;
    services: any;
    agencyCriteres: any;
} | null>;
export declare const getCriteresParOperation: (args: {
    id_agence?: number;
}, context: any) => Promise<{
    operations: any;
    nonAssignees: any;
}>;
export declare const getRadarStats: (args: {
    id_agence?: number;
}, context: any) => Promise<{
    subject: string;
    A: number;
    fullMark: number;
}[]>;
export declare const getObjectifs: (args: {
    id_agence?: number;
}, context: any) => Promise<any>;
export declare const getTachesCorrectives: (_args: void, context: any) => Promise<any>;
export declare const getArchives: (_args: void, context: any) => Promise<{
    guichets: any;
    agences: any;
    alertes: any;
    taches: any;
}>;
export declare const getAffectationsDuJour: (args: {
    id_agence: number;
    date?: string;
}, context: any) => Promise<any>;
export declare const getTendanceMensuelle: (args: {
    id_agence?: number;
}, context: any) => Promise<{
    mois: string;
    score_moyen: number;
    nb_avis: number;
}[]>;
export declare const getStatsByAgent: (args: {
    id_agence?: number;
    nbJours?: number;
} | void, context: any) => Promise<any>;
export declare const getStatsByGuichet: (args: {
    id_agence?: number;
    nbJours?: number;
} | void, context: any) => Promise<any>;
export declare const getActionsPrioritaires: (_args: void, context: any) => Promise<{
    alertesNouvelles: any;
    tachesEnRetard: any;
}>;
export declare const getKPIsPeriode: (args: {
    nbJours?: number;
} | void, context: any) => Promise<{
    nb_jours: number;
    periode_actuelle: {
        nb: number;
        nb_notes: number;
        moyenne: number;
        satisfaction: number;
    };
    periode_precedente: {
        nb: number;
        nb_notes: number;
        moyenne: number;
        satisfaction: number;
    };
    delta_satisfaction_pts: number;
    delta_note_pts: number;
    delta_volume_pct: number;
    par_operation: {
        nb: number;
        moyenne: number;
        satisfaction: number;
        id: number | null;
        libelle: string;
    }[];
}>;
export declare const getTempsTraitement: (args: {
    nbJours?: number;
} | void, context: any) => Promise<{
    nb_jours: number;
    prise_en_charge: {
        moyenne_heures: number | null;
        nb: any;
        delta_heures: number | null;
    };
    resolution: {
        moyenne_heures: number | null;
        nb: any;
        delta_heures: number | null;
    };
}>;
export declare const getComparaisonAgences: (args: {
    nbJours?: number;
} | void, context: any) => Promise<{
    nb_jours: number;
    agences: {
        id_agence: number;
        nom_agence: string;
        commune: string;
        nb_avis: number;
        score_moyen: number | null;
        taux_satisfaction: number | null;
    }[];
    meilleure_agence: string;
    agence_a_surveiller: string | null;
    moyenne_globale: number | null;
}>;
export declare const getHeatmapReponses: (args: {
    id_agence?: number;
    nbJours?: number;
} | void, context: any) => Promise<{
    nb_jours: number;
    total_avis: number;
    max_nb: number;
    cellules: {
        jour: number;
        jour_label: string;
        heure: number;
        nb: number;
        score_moyen: number | null;
    }[];
}>;
export declare const getTacheHistorique: (args: {
    id_tache: number;
}, context: any) => Promise<any>;
export declare const getObjectifsParAgence: (_args: void, context: any) => Promise<any>;
export declare const getRechercheGlobale: (args: {
    q: string;
}, context: any) => Promise<{
    agences: any;
    guichets: any;
    agents: any;
    avis: any;
}>;
export declare const getAIStatus: (_args: void, context: any) => Promise<{
    stats: {
        total: any;
        done: any;
        pending: any;
        failed: any;
    };
    configured: boolean;
    modelIsFree: boolean;
    provider: string;
    model: string;
    baseUrl: string;
    verifiedAt: string | null;
    lastProbeStatus: "success" | "failed" | null;
}>;
export declare const getThemesStats: (args: {
    nbJours?: number;
}, context: any) => Promise<{
    total: number;
    topThemes: {
        theme: string;
        count: number;
    }[];
    topSousThemes: {
        theme: string;
        count: number;
    }[];
}>;
export declare const getIndicateursExperience: (args: {
    nbJours?: number;
}, context: any) => Promise<{
    periode: {
        debut: Date;
        fin: Date;
        nbJours: number;
    };
    agregats: import("./gex/moteurGlobal").AgregatsGlobaux;
    indice: {
        indice: number | null;
        formule: string;
    };
    derniereAnalyse: any;
} | null>;
export type MoyenneParCritere = {
    id_critere: number;
    libelle: string;
    type: string;
    scoring_mode: string | null;
    kind: 'SATISFACTION' | 'NPS' | 'CES' | 'CATEGORIEL' | 'TEXTE';
    /** Avis distincts ayant répondu à ce critère (toutes lignes). */
    nb_avis: number;
    /** Lignes notables (base réelle des moyennes). */
    nb_notables: number;
    /** Moyenne /5 (null si non-satisfaction ou n<5). */
    moyenne_sur5: number | null;
    /** % d'avis >= 4/5 (null si non-satisfaction ou n<5). */
    satisfaction_pct: number | null;
    distribution: {
        '1': number;
        '2': number;
        '3': number;
        '4': number;
        '5': number;
    };
    /** NPS %promoteurs − %détracteurs (null si volume<5 ; null hors NPS). */
    nps: number | null;
    nps_detail: {
        volume: number;
        promoteurs: number;
        passifs: number;
        detracteurs: number;
    } | null;
    ces_volume: number;
    ces_top_box: number | null;
    ces_effort_moyen: number | null;
};
export type MoyennesParCritereResult = {
    nb_jours: number;
    criteres: MoyenneParCritere[];
};
export declare const getMoyennesParCritere: (args: {
    id_agence?: number;
    nbJours?: number;
} | void, context: any) => Promise<{
    nb_jours: number;
    criteres: MoyenneParCritere[];
}>;
export type RepartitionOptionsResult = {
    id_critere: number;
    libelle: string;
    nb_jours: number;
    /** Avis distincts ayant répondu (dénominateur unique des %). */
    nb_avis: number;
    options: {
        option_id: string;
        libelle: string;
        nb: number;
        pct: number | null;
    }[];
};
export declare const getRepartitionOptions: (args: {
    id_critere: number;
    id_agence?: number;
    nbJours?: number;
}, context: any) => Promise<{
    id_critere: number;
    libelle: any;
    nb_jours: number;
    nb_avis: number;
    options: import("./kpiParTerme").LigneRepartition[];
}>;
export type PointTendanceCritere = {
    cle: string;
    libelle: string;
    nb_avis: number;
    moyenne_sur5: number | null;
    nps: number | null;
    nps_detail: {
        volume: number;
        promoteurs: number;
        passifs: number;
        detracteurs: number;
    };
};
export type SerieParCritere = {
    id_critere: number;
    libelle: string;
    points: {
        cle: string;
        nb: number;
        moyenne_sur5: number | null;
    }[];
};
export type TendanceParCritereResult = {
    nb_mois: number;
    /** Filtre éventuel (null = tous les critères). */
    id_critere: number | null;
    libelle: string | null;
    /** Série globale : moyenne satisfaction + série NPS par mois. */
    points: PointTendanceCritere[];
    /** Courbes par terme (critères de satisfaction présents, seuil par point). */
    series: SerieParCritere[];
};
export declare const getTendanceParCritere: (args: {
    id_agence?: number;
    nbMois?: number;
    id_critere?: number;
} | void, context: any) => Promise<{
    nb_mois: number;
    id_critere: number | null;
    libelle: string | null;
    points: import("./kpiParTerme").PointTendance[];
    series: SerieParCritere[];
}>;
export {};
