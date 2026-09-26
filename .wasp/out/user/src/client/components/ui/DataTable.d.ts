import React from 'react';
export declare const DataTable: ({ headers, children, maxHeight, className, }: {
    headers?: string[];
    children: React.ReactNode;
    maxHeight?: string;
    className?: string;
}) => React.JSX.Element;
export declare const DataTableRow: ({ children, onClick, onKeyDown, tabIndex, className, "aria-label": ariaLabel, }: {
    children: React.ReactNode;
    onClick?: () => void;
    /** Vague 4 : l'action clavier de la ligne. Par défaut Entrée et Espace
     *  rejouent le `onClick`, comme attendu d'un élément activable. */
    onKeyDown?: (event: React.KeyboardEvent<HTMLTableRowElement>) => void;
    /** Permet à l'appelant de retirer la ligne du parcours de tabulation
     *  (patron « roving tabindex ») quand le tableau a des lignes
     *  activables et une navigation par flèches. */
    tabIndex?: number;
    className?: string;
    "aria-label"?: string;
}) => React.JSX.Element;
