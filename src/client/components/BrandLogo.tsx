import React from 'react';
import { useBrand } from '../context/BrandContext';
import { YebaLogo } from './YebaLogo';
import { cn } from '../utils';

type BrandLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  mode?: 'light' | 'dark' | 'auto';
};

export function BrandLogo({ className = "size-8", width, height, mode = 'auto' }: BrandLogoProps) {
  const { brandConfig } = useBrand();

  const logoUrl = mode === 'dark' 
    ? (brandConfig?.logo_dark_url || brandConfig?.logo_url) 
    : brandConfig?.logo_url;

  if (logoUrl) {
    // On ne fixe une taille en pixels via `style` que si elle est explicitement
    // demandée (width/height fournis). Sinon on laisse `className` (ex: "size-8")
    // piloter la taille : un style inline aurait toujours priorité sur les
    // classes Tailwind et forcerait le logo à sa taille naturelle (souvent
    // énorme pour un logo uploadé par un client), cassant la mise en page.
    const hasExplicitSize = width !== undefined || height !== undefined;

    return (
      <img
        src={logoUrl}
        alt={brandConfig?.platform_name || "Logo"}
        className={cn("object-contain shrink-0 max-w-full max-h-full", className)}
        style={
          hasExplicitSize
            ? {
                width: width ? `${width}px` : undefined,
                height: height ? `${height}px` : undefined,
              }
            : undefined
        }
      />
    );
  }

  return <YebaLogo className={cn("shrink-0", className)} width={width} height={height} />;
}
