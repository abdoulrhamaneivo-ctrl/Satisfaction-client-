import React from 'react';
type AlerteItem = {
    id: string;
    message: string;
    type_alerte: string;
    date_creation: string;
    guichet: string | null;
    gravite: 'HAUTE' | 'MOYENNE';
};
type TacheItem = {
    id: string;
    titre: string;
    date_echeance: string;
    responsable: string;
    guichet: string | null;
    joursRetard: number;
};
interface ActionsPrioritairesProps {
    alertesNouvelles: AlerteItem[];
    tachesEnRetard: TacheItem[];
    isLoading?: boolean;
}
export declare const ActionsPrioritaires: ({ alertesNouvelles, tachesEnRetard, isLoading, }: ActionsPrioritairesProps) => React.JSX.Element;
export {};
//# sourceMappingURL=ActionsPrioritaires.d.ts.map