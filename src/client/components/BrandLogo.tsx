import React from 'react';
import { useBrand } from '../context/BrandContext';
import { CXSATLogo } from './CXSATLogo';

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
    return (
      <img
        src={logoUrl}
        alt={brandConfig?.platform_name || "Logo"}
        className={className}
        style={{
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
          objectFit: 'contain',
        }}
      />
    );
  }

  return <CXSATLogo className={className} width={width} height={height} />;
}
