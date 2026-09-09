import React from 'react';
export type AgenceReseauLigne = {
    nom_agence: string;
    commune?: string | null;
    nb_avis: number;
    score_moyen: number | null;
    taux_satisfaction: number | null;
    delta_note?: number | null;
};
export interface RapportReseauProps {
    entrepriseName: string;
    periodeLabel: string;
    dateDebut: Date;
    dateFin: Date;
    satisfaction: number;
    noteMoyenne: number;
    totalAvis: number;
    deltaSatisfaction: number;
    deltaNote: number;
    deltaVolume: number;
    moyenneGlobale: number | null;
    meilleureAgence: string | null;
    agenceASurveiller: string | null;
    agences: AgenceReseauLigne[];
    alertesNouvelles: number;
    tachesEnCours: number;
    themes: {
        theme: string;
        count: number;
    }[];
}
export declare const RapportReseauPrint: React.ForwardRefExoticComponent<RapportReseauProps & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=RapportReseauPrint.d.ts.map