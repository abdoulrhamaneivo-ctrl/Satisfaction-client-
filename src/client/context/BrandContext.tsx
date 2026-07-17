import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, getBrandConfig } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';

type BrandConfigType = {
  id: number;
  id_entreprise: number;
  platform_name: string;
  platform_description: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  color_background: string;
  color_foreground: string;
  color_card: string;
  color_card_foreground: string;
  color_popover: string;
  color_popover_foreground: string;
  color_primary: string;
  color_primary_foreground: string;
  color_secondary: string;
  color_secondary_foreground: string;
  color_accent: string;
  color_accent_foreground: string;
  color_muted: string;
  color_muted_foreground: string;
  color_destructive: string;
  color_destructive_foreground: string;
  color_success: string;
  color_success_foreground: string;
  color_warning: string;
  color_warning_foreground: string;
  color_border: string;
  color_input: string;
  color_ring: string;
  border_radius: string;
  shadow_style: string;
  font_family: string;
  font_url: string | null;
  form_title: string;
  form_subtitle: string;
  form_thank_you: string;
  qr_slogan: string;
  ussd_help_text: string;
  hide_cxsat_branding: boolean;
};

type BrandContextType = {
  brandConfig: BrandConfigType | null;
  isLoading: boolean;
  setLocalOverload: (config: BrandConfigType | null) => void;
};

const BrandContext = createContext<BrandContextType>({
  brandConfig: null,
  isLoading: true,
  setLocalOverload: () => {},
});

export const useBrand = () => useContext(BrandContext);

export const BrandProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: user } = useAuth();
  
  // Permet à des pages publiques (comme CollectePage) d'injecter la marque du guichet
  const [localOverload, setLocalOverload] = useState<BrandConfigType | null>(null);

  // Charger la config de marque de l'utilisateur connecté s'il y en a un
  const { data: fetchedConfig, isLoading } = useQuery(
    getBrandConfig,
    {},
    { enabled: !!user }
  );

  const activeConfig = localOverload || fetchedConfig || null;

  useEffect(() => {
    if (!activeConfig) {
      // Nettoyer le style injecté s'il n'y a pas de config
      const existingStyle = document.getElementById('cxsat-brand-tokens');
      if (existingStyle) existingStyle.remove();
      return;
    }

    // Définir les ombres personnalisées
    let shadowStyles = '';
    if (activeConfig.shadow_style === 'NONE') {
      shadowStyles = `
        --shadow-premium: none;
        --shadow-card: none;
        --shadow-default: none;
        --shadow-premium-lg: none;
      `;
    } else if (activeConfig.shadow_style === 'SHARP') {
      shadowStyles = `
        --shadow-premium: 4px 4px 0px 0px hsl(${activeConfig.color_foreground} / 0.15);
        --shadow-card: 2px 2px 0px 0px hsl(${activeConfig.color_foreground} / 0.1);
        --shadow-premium-lg: 6px 6px 0px 0px hsl(${activeConfig.color_foreground} / 0.2);
      `;
    } else if (activeConfig.shadow_style === 'GLOW') {
      shadowStyles = `
        --shadow-premium: 0 0 15px hsl(${activeConfig.color_primary} / 0.12);
        --shadow-card: 0 0 10px hsl(${activeConfig.color_primary} / 0.08);
        --shadow-premium-lg: 0 0 25px hsl(${activeConfig.color_primary} / 0.18);
      `;
    }

    // Créer ou modifier l'élément style
    let styleElement = document.getElementById('cxsat-brand-tokens');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'cxsat-brand-tokens';
      document.head.appendChild(styleElement);
    }

    // NOTE IMPORTANTE (personnalisation totale) :
    // Main.css définit aussi --card-accent, --card-subtle et --secondary-muted
    // (utilisés par de nombreux composants : cartes, badges, fonds subtils…).
    // Avant ce correctif, ces 3 tokens n'étaient JAMAIS recalculés par la marque :
    // ils restaient figés sur les valeurs par défaut du thème, ce qui cassait la
    // cohérence visuelle dès qu'un client choisissait des couleurs personnalisées
    // (cartes/zones qui ne matchent pas le reste = "trous" visuels signalés).
    // On les dérive donc ici à partir des couleurs déjà personnalisables.
    const cardAccent = activeConfig.color_accent;
    const cardAccentForeground = activeConfig.color_accent_foreground;
    const cardSubtle = activeConfig.color_muted;
    const cardSubtleForeground = activeConfig.color_muted_foreground;
    const secondaryMuted = activeConfig.color_secondary;
    const secondaryMutedForeground = activeConfig.color_secondary_foreground;

    // Injecter les polices Google et les custom properties.
    // Portée : `:root:not(.dark)` uniquement. Avant ce correctif, la règle
    // ciblait `:root` sans condition : comme ce <style> est injecté APRES la
    // feuille de style principale, il gagnait systématiquement sur les
    // variables `.dark { ... }` du thème sombre (même spécificité CSS => le
    // dernier bloc dans le DOM l'emporte). Résultat : activer le mode sombre
    // ne changeait presque rien tant qu'une marque personnalisée était active,
    // et l'app paraissait "cassée" en dark. Le mode clair (préféré sur mobile)
    // reste, lui, personnalisable à 100%.
    styleElement.innerHTML = `
      ${activeConfig.font_url ? `@import url('${activeConfig.font_url}');` : ''}
      :root:not(.dark) {
        --background: ${activeConfig.color_background};
        --foreground: ${activeConfig.color_foreground};
        --card: ${activeConfig.color_card};
        --card-foreground: ${activeConfig.color_card_foreground};
        --card-accent: ${cardAccent};
        --card-accent-foreground: ${cardAccentForeground};
        --card-subtle: ${cardSubtle};
        --card-subtle-foreground: ${cardSubtleForeground};
        --popover: ${activeConfig.color_popover};
        --popover-foreground: ${activeConfig.color_popover_foreground};
        --primary: ${activeConfig.color_primary};
        --primary-foreground: ${activeConfig.color_primary_foreground};
        --secondary: ${activeConfig.color_secondary};
        --secondary-foreground: ${activeConfig.color_secondary_foreground};
        --secondary-muted: ${secondaryMuted};
        --secondary-muted-foreground: ${secondaryMutedForeground};
        --accent: ${activeConfig.color_accent};
        --accent-foreground: ${activeConfig.color_accent_foreground};
        --muted: ${activeConfig.color_muted};
        --muted-foreground: ${activeConfig.color_muted_foreground};
        --destructive: ${activeConfig.color_destructive};
        --destructive-foreground: ${activeConfig.color_destructive_foreground};
        --success: ${activeConfig.color_success};
        --success-foreground: ${activeConfig.color_success_foreground};
        --warning: ${activeConfig.color_warning};
        --warning-foreground: ${activeConfig.color_warning_foreground};
        --border: ${activeConfig.color_border};
        --input: ${activeConfig.color_input};
        --ring: ${activeConfig.color_ring};
        --radius: ${activeConfig.border_radius};
        ${shadowStyles}
      }
      body {
        font-family: '${activeConfig.font_family}', var(--font-satoshi), system-ui, sans-serif !important;
      }
    `;

    // Mettre à jour la Favicon si présente
    if (activeConfig.favicon_url) {
      let faviconElement = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!faviconElement) {
        faviconElement = document.createElement('link');
        faviconElement.rel = 'shortcut icon';
        document.head.appendChild(faviconElement);
      }
      faviconElement.href = activeConfig.favicon_url;
    }

    // Mettre à jour le titre du document si on est hors de la landing page
    if (window.location.pathname !== '/' && activeConfig.platform_name) {
      document.title = `${activeConfig.platform_name} — Satisfaction`;
    }
  }, [activeConfig]);

  return (
    <BrandContext.Provider value={{ brandConfig: activeConfig, isLoading, setLocalOverload }}>
      {children}
    </BrandContext.Provider>
  );
};
