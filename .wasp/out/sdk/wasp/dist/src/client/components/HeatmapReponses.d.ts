import React from 'react';
type Cellule = {
    jour: number;
    jour_label: string;
    heure: number;
    nb: number;
    score_moyen: number | null;
};
type HeatmapData = {
    nb_jours: number;
    total_avis: number;
    max_nb: number;
    cellules: Cellule[];
};
export declare const HeatmapReponses: ({ data, isLoading }: {
    data?: HeatmapData;
    isLoading?: boolean;
}) => React.JSX.Element;
export {};
//# sourceMappingURL=HeatmapReponses.d.ts.map