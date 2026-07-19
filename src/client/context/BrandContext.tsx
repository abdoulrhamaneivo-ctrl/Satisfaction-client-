import React, { createContext, useContext, useEffect } from 'react';
import { BRANDING, type BrandConfigType } from '../../shared/branding';

type BrandContextType = {
  brandConfig: BrandConfigType;
  isLoading: boolean;
};

const BrandContext = createContext<BrandContextType>({
  brandConfig: BRANDING,
  isLoading: false,
});

export const useBrand = () => useContext(BrandContext);

export const BrandProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Définir les ombres personnalisées
    let shadowStyles = '';
    if (BRANDING.shadow_style === 'NONE') {
      shadowStyles = `
        --shadow-premium: none;
        --shadow-card: none;
        --shadow-default: none;
        --shadow-premium-lg: none;
      `;
    } else if (BRANDING.shadow_style === 'SHARP') {
      shadowStyles = `
        --shadow-premium: 4px 4px 0px 0px hsl(${BRANDING.color_foreground} / 0.15);
        --shadow-card: 2px 2px 0px 0px hsl(${BRANDING.color_foreground} / 0.1);
        --shadow-premium-lg: 6px 6px 0px 0px hsl(${BRANDING.color_foreground} / 0.2);
      `;
    } else if (BRANDING.shadow_style === 'GLOW') {
      shadowStyles = `
        --shadow-premium: 0 0 15px hsl(${BRANDING.color_primary} / 0.12);
        --shadow-card: 0 0 10px hsl(${BRANDING.color_primary} / 0.08);
        --shadow-premium-lg: 0 0 25px hsl(${BRANDING.color_primary} / 0.18);
      `;
    } else {
      shadowStyles = `
        --shadow-premium: 0 4px 20px -2px hsl(${BRANDING.color_primary} / 0.1);
        --shadow-card: 0 2px 12px -1px hsl(${BRANDING.color_primary} / 0.06);
        --shadow-premium-lg: 0 10px 30px -5px hsl(${BRANDING.color_primary} / 0.15);
      `;
    }

    // Créer ou modifier l'élément style
    let styleElement = document.getElementById('yeba-brand-tokens');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'yeba-brand-tokens';
      document.head.appendChild(styleElement);
    }

    const cardAccent = BRANDING.color_accent;
    const cardAccentForeground = BRANDING.color_accent_foreground;
    const cardSubtle = BRANDING.color_muted;
    const cardSubtleForeground = BRANDING.color_muted_foreground;
    const secondaryMuted = BRANDING.color_secondary;
    const secondaryMutedForeground = BRANDING.color_secondary_foreground;

    styleElement.innerHTML = `
      ${BRANDING.font_url ? `@import url('${BRANDING.font_url}');` : ''}
      :root:not(.dark) {
        --background: ${BRANDING.color_background};
        --foreground: ${BRANDING.color_foreground};
        --card: ${BRANDING.color_card};
        --card-foreground: ${BRANDING.color_card_foreground};
        --card-accent: ${cardAccent};
        --card-accent-foreground: ${cardAccentForeground};
        --card-subtle: ${cardSubtle};
        --card-subtle-foreground: ${cardSubtleForeground};
        --popover: ${BRANDING.color_popover};
        --popover-foreground: ${BRANDING.color_popover_foreground};
        --primary: ${BRANDING.color_primary};
        --primary-foreground: ${BRANDING.color_primary_foreground};
        --secondary: ${BRANDING.color_secondary};
        --secondary-foreground: ${BRANDING.color_secondary_foreground};
        --secondary-muted: ${secondaryMuted};
        --secondary-muted-foreground: ${secondaryMutedForeground};
        --accent: ${BRANDING.color_accent};
        --accent-foreground: ${BRANDING.color_accent_foreground};
        --muted: ${BRANDING.color_muted};
        --muted-foreground: ${BRANDING.color_muted_foreground};
        --destructive: ${BRANDING.color_destructive};
        --destructive-foreground: ${BRANDING.color_destructive_foreground};
        --success: ${BRANDING.color_success};
        --success-foreground: ${BRANDING.color_success_foreground};
        --warning: ${BRANDING.color_warning};
        --warning-foreground: ${BRANDING.color_warning_foreground};
        --border: ${BRANDING.color_border};
        --input: ${BRANDING.color_input};
        --ring: ${BRANDING.color_ring};
        --radius: ${BRANDING.border_radius};
        ${shadowStyles}
      }
      body {
        font-family: '${BRANDING.font_family}', var(--font-satoshi), system-ui, sans-serif !important;
      }
    `;

    // Mettre à jour la Favicon si présente
    if (BRANDING.favicon_url) {
      let faviconElement = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!faviconElement) {
        faviconElement = document.createElement('link');
        faviconElement.rel = 'shortcut icon';
        document.head.appendChild(faviconElement);
      }
      faviconElement.href = BRANDING.favicon_url;
    }

    // Mettre à jour le titre du document si on est hors de la landing page
    if (window.location.pathname !== '/' && BRANDING.platform_name) {
      document.title = `${BRANDING.platform_name} — Satisfaction`;
    }
  }, []);

  return (
    <BrandContext.Provider value={{ brandConfig: BRANDING, isLoading: false }}>
      {children}
    </BrandContext.Provider>
  );
};
