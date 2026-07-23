import React from 'react';
import { cn } from '../utils';

/**
 * Brand-aligned ambient page shell.
 * Soft, slowly-floating navy + amber halos on a subtly tinted background.
 * Keeps the exact brand palette (primary / secondary) — no off-brand hues.
 * Light mode: slightly warm background with visible halos.
 * Dark mode: rich navy shell with glowing halos.
 */
export const AmbientBackground = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'relative min-h-screen',
        // Mode clair : repose désormais sur la même variable --background que
        // le reste du thème (au lieu d'une teinte codée en dur légèrement
        // différente), pour une cohérence parfaite et le même effort de
        // réduction de la fatigue visuelle appliqué globalement.
        'bg-background dark:bg-transparent',
        className,
      )}
    >
      {/* Ambient halos — renforcés en mode clair */}
      <div className="relative">{children}</div>
    </div>
  );
};
