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
    /** Phase L : effort perçu. null / absent = non mesuré (jamais 0 %). */
    ces?: {
        volume: number;
        echelle: number;
        top_box: number;
        taux_effort_eleve: number;
        note_effort_moyenne: number | null;
    } | null;
}
export declare const RapportReseauPrint: React.ForwardRefExoticComponent<RapportReseauProps & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=RapportReseauPrint.d.ts.map