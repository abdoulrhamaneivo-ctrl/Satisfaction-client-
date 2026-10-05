// src/client/components/PageShell.tsx
// ============================================================================
// Coque de page UNIQUE (audit UX Lot 1) : toutes les pages métier partagent
// la même largeur, le même rythme et le même fil d'Ariane.
// - PageShell : conteneur max-w-7xl + paddings + espacements.
// - PageTopNav : fil d'Ariane <ol> + onglets inter-pages en NavLink
//   (navigation SPA sans rechargement, accessibles au clavier, aria-current).
// ============================================================================
import React from 'react';
import { NavLink } from 'react-router';
export const PageShell = ({ children }) => (
// Task 1 tactile : gouttières réduites sur mobile (px-4) — le p-6
// d'origine laissait ~12px utiles à 360px une fois la marge du contenu
// déduite. Desktop inchangé (sm:p-6, lg:p-10).
<div className="mx-auto max-w-7xl px-4 py-6 sm:p-6 lg:p-10 space-y-8">{children}</div>);
export const PageTopNav = ({ racine, agence, actuel, onglets }) => (<nav aria-label="Fil d'Ariane et navigation secondaire" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
    <ol className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground list-none p-0 m-0">
      <li>{racine}</li>
      <li aria-hidden="true">/</li>
      <li className="text-foreground">{agence || 'Agence Principale'}</li>
      <li aria-hidden="true">/</li>
      <li aria-current="page" className="text-primary font-bold">
        {actuel}
      </li>
    </ol>

    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-bold">
      {/* NavLink pose aria-current="page" automatiquement sur l'onglet actif. */}
      {onglets.map((o) => (<NavLink key={o.to} to={o.to} end className={({ isActive }) => isActive
            ? 'text-primary border-b-2 border-primary py-2 font-bold inline-flex min-h-[44px] items-center'
            : 'text-muted-foreground hover:text-foreground py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm inline-flex min-h-[44px] items-center'}>
          {o.label}
        </NavLink>))}
    </div>
  </nav>);
//# sourceMappingURL=PageShell.jsx.map