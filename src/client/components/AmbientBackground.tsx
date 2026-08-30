import React from 'react';
import { cn } from '../utils';
import { AnimatedBackground } from './AnimatedBackground';

/**
 * Coquille de page : fond uni de la marque + blobs animés (vert/jaune)
 * qui flottent lentement en arrière-plan. Le contenu reste au-dessus.
 */
export const AmbientBackground = ({
  children,
  className,
  animated = true,
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
      {animated && <AnimatedBackground />}
      <div className="relative">{children}</div>
    </div>
  );
};
