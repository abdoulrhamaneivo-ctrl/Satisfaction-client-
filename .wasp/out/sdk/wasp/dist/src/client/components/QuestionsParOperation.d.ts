import React from 'react';
/**
 * PRÉDICAT PUR — testé, sans rendu. Vrai quand ce déplacement viderait une
 * opération de sa DERNIÈRE question : la colonne d'origine est une vraie
 * opération (pas le vivier), elle ne contient que cette question, et la
 * destination est ailleurs (pas un réordonnancement interne ni un no-op).
 * Le cas « opération vide » affiche « Questionnaire en préparation » au QR —
 * c'est le seul déplacement qui mérite une confirmation explicite.
 */
export declare function operationVideeApresDeplacement(sourceCol: {
    key: string;
    id_service: number | null;
    criteres: Array<{
        id: number;
    }>;
} | null | undefined, activeId: number, destKey: string): boolean;
export declare const QuestionsParOperation: ({ selectedAgenceId }: {
    selectedAgenceId: number;
}) => React.JSX.Element;
//# sourceMappingURL=QuestionsParOperation.d.ts.map