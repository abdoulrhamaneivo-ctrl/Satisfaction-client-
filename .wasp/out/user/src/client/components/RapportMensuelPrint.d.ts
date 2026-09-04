import React from 'react';
interface AlerteRapport {
    id: any;
    date_creation: string | Date;
    message: string;
    statut_alerte: string;
}
interface TacheRapport {
    id: any;
    id_alerte?: any;
    titre: string;
}
interface ThemeRapport {
    theme: string;
    count: number;
}
interface GuichetStat {
    nom: string;
    score_moyen: number;
    nb_avis: number;
}
export interface RapportProps {
    reponses: any[];
    radarData: {
        subject: string;
        A: number;
    }[];
    alertes: AlerteRapport[];
    taches: TacheRapport[];
    themes: ThemeRapport[];
    guichets: GuichetStat[];
    agenceName: string;
    commune: string;
    periodeLabel: string;
    dateDebut: Date;
    dateFin: Date;
    deltas: {
        satisfaction: number;
        note: number;
        volume: number;
    };
    tempsTraitement?: {
        moyenne_heures: number | null;
    } | null;
}
export declare const RapportMensuelPrint: React.ForwardRefExoticComponent<RapportProps & React.RefAttributes<HTMLDivElement>>;
export {};
