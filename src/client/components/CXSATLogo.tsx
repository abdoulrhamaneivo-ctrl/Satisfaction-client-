import React from 'react';

export function CXSATLogo({ className = "size-8", width = 32, height = 32 }: { className?: string; width?: number; height?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
    >
      <defs>
        <linearGradient id="cxsatLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(32 100% 37%)" /> {/* orange chaleureux */}
          <stop offset="100%" stopColor="hsl(33 74% 62%)" /> {/* accent */}
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-muted-foreground opacity-30" />
      <path
        d="M30 35C30 29.5 34.5 25 40 25H68C73.5 25 78 29.5 78 35V55C78 60.5 73.5 65 68 65H45L32 75V62C30.8 59.8 30 57.5 30 55V35Z"
        fill="url(#cxsatLogoGrad)"
      />
      <path
        d="M48 45L53 50L64 38"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
