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
        score_min: number;
        score_moyen: number;
        analyseIA: any;
        reponses: {
            id: any;
            score_brut: any;
            critere: any;
            analyseIA: any;
        }[];
    }[];
    total: any;
    hasMore: boolean;
    page: number;
    pageSize: number;
}>;
export declare const exportAvisGroupes: (args: GetReponsesArgs, context: any) => Promise<{
    id_soumission: string;
    date_reponse: any;
    guichet: any;
    agence: any;
    service: any;
    agent: string;
    score_moyen: number;
    commentaire: string;
    criteres: string;
}[]>;
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
export declare const getBranding: (_args: void, context: any) => Promise<any>;
export declare const getFormDefinitionForGuichet: (args: {
    code_public?: string;
    id_guichet?: number;
}, context: any) => Promise<{
    guichetName: any;
    id_guichet: any;
    id_agence: any;
    services: any;
    agencyCriteres: any;
    brandConfig: {
        hide_yeba_branding: any;
        color_background: any;
        color_accent: any;
        color_secondary: any;
        color_primary: any;
        platform_name: any;
        logo_url: any;
        form_title: any;
        form_subtitle: any;
        form_thank_you: any;
        qr_slogan: any;
        platform_description: string;
        logo_dark_url: null;
        favicon_url: null;
        color_foreground: string;
        color_card: string;
        color_card_foreground: string;
        color_popover: string;
        color_popover_foreground: string;
        color_primary_foreground: string;
        color_secondary_foreground: string;
        color_secondary_muted: string;
        color_secondary_muted_foreground: string;
        color_accent_foreground: string;
        color_muted: string;
        color_muted_foreground: string;
        color_destructive: string;
        color_destructive_foreground: string;
        color_success: string;
        color_success_foreground: string;
        color_warning: string;
        color_warning_foreground: string;
        color_border: string;
        color_input: string;
        color_ring: string;
        border_radius: string;
        shadow_style: string;
        font_family: string;
        font_url: null;
        ussd_help_text: string;
        qr_style: string;
        qr_frame: string;
        qr_color: null;
        qr_bg_color: null;
    };
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
        moyenne: number;
        satisfaction: number;
    };
    periode_precedente: {
        nb: number;
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
    configured: boolean;
    provider: string;
    model: string;
    baseUrl: string;
    stats: {
        total: any;
        done: any;
        pending: any;
        failed: any;
    };
}>;
export declare const getThemesStats: (args: {
    nbJours?: number;
}, context: any) => Promise<{
    total: number;
    topThemes: {
        theme: string;
        count: number;
    }[];
}>;
export {};
