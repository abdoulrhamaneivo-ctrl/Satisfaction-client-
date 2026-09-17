import React from 'react';
type Objectif = {
    id: number;
    critere?: {
        libelle_critere?: string;
    };
    cible_pct: number;
    realise_pct: number | null;
    ecart: number | null;
    statut: 'ATTEINT' | 'EN_RETARD' | 'PAS_DE_DONNEES';
    nb_avis: number;
};
export declare const ObjectifsProgress: ({ data }: {
    data: Objectif[];
}) => React.JSX.Element;
export {};
