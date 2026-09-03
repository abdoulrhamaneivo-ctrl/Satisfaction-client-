import React from 'react';
/**
 * Coquille de page : fond uni de la marque + blobs décoratifs.
 *
 * PERFORMANCE (fix « saisie clavier lente ») : les blobs ne sont PLUS animés
 * en framer-motion (4 x blur-3xl = 4 filtres GPU qui se re-composent à chaque
 * frappe dans les Textarea → latence de saisie visible sur mobile). Ils sont
 * désormais des div statiques peintes une seule fois (aucun reflow, aucune
 * animation pendant la frappe). L'animation de fond reste disponible sur les
 * pages de pilotage via <AnimatedBackground />.
 */
export declare const AmbientBackground: ({ children, className, animated, }: {
    children: React.ReactNode;
    className?: string;
    animated?: boolean;
}) => React.JSX.Element;
/**
 * Blobs STATIQUES (zéro animation JS) — décoration pure, coût GPU nul après
 * le premier paint. Utilisés sur les pages de saisie (formulaire scan).
 */
export declare const AnimatedBackgroundStatic: () => React.JSX.Element;
//# sourceMappingURL=AmbientBackground.d.ts.map