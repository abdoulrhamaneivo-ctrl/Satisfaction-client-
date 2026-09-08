import React from 'react';
export declare const PageShell: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export type OngletPage = {
    label: string;
    to: string;
};
type PageTopNavProps = {
    /** Premier segment, ex. "Exploitation", "Écoute Client", "Administration". */
    racine: string;
    /** Nom d'agence affiché (ou nœud custom, ex. sélecteur Direction). */
    agence?: React.ReactNode;
    /** Page courante, ex. "Planning Guichets". */
    actuel: string;
    /** Onglets inter-pages (le lien actif est détecté automatiquement). */
    onglets: OngletPage[];
};
export declare const PageTopNav: ({ racine, agence, actuel, onglets }: PageTopNavProps) => React.JSX.Element;
export {};
//# sourceMappingURL=PageShell.d.ts.map