import React from 'react';
import { cn } from '../utils';

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
export const AmbientBackground = ({
  children,
  className,
  animated = false,
}: {
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
}) => {
  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden bg-background',
        className,
      )}
    >
      {animated ? (
        <AnimatedBackgroundStatic />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
};

/**
 * Blobs STATIQUES (zéro animation JS) — décoration pure, coût GPU nul après
 * le premier paint. Utilisés sur les pages de saisie (formulaire scan).
 */
export const AnimatedBackgroundStatic = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute top-[-12%] left-[-8%] size-[38rem] rounded-full bg-brand-green/8 blur-3xl" />
    <div className="absolute top-[10%] right-[-10%] size-[30rem] rounded-full bg-warning/8 blur-3xl" />
    <div className="absolute bottom-[-14%] left-[12%] size-[34rem] rounded-full bg-brand-green-deep/6 blur-3xl" />
    <div className="absolute top-[42%] left-[36%] size-[24rem] rounded-full bg-warning/5 blur-3xl" />
  </div>
);
