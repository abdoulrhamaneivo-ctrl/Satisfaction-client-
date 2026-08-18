import React from 'react';

/**
 * Pictogramme Yeba — La Poste de Côte d'Ivoire.
 * Bulle de discussion Verte Émeraude + Coche de validation Or / Jaune Poste CI.
 */
export function YebaLogo({ className = "size-8", width = 32, height = 32 }: { className?: string; width?: number; height?: number }) {
  return (
    <svg
      viewBox="0 0 202 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
    >
      <defs>
        {/* Vert Émeraude La Poste CI */}
        <linearGradient id="yebaLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Jaune / Or Vibrant La Poste CI */}
        <linearGradient id="yebaLogoCheck" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Bulle de discussion vert émeraude */}
      <path
        fill="url(#yebaLogoGrad)"
        d="M96 0C43 0 0 43 0 96C0 149 43 192 96 192C117 192 136 186 153 176L190 192L180 157C194 141 202 120 202 96C202 43 159 0 96 0Z"
      />

      {/* "Y" fusionné en blanc */}
      <path
        fill="#fff"
        d="M56 54L96 96L136 54C140 50 146 50 150 54C154 58 154 64 150 68L108 112L108 152C108 158 103 162 96 162C89 162 84 158 84 152L84 112L42 68C38 64 38 58 42 54C46 50 52 50 56 54Z"
      />

      {/* Coche de validation Or Poste CI */}
      <path
        d="M58 103 L83 128 L145 67"
        fill="none"
        stroke="url(#yebaLogoCheck)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
