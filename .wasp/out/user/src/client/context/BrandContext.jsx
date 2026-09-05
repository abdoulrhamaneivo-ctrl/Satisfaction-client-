import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery, getBranding } from 'wasp/client/operations';
import { BRANDING } from '../../shared/branding';
const BrandContext = createContext({
    brandConfig: BRANDING,
    isLoading: false,
});
export const useBrand = () => useContext(BrandContext);
export const BrandProvider = ({ children }) => {
    const { data: user } = useAuth();
    // Personnalisation tenant (FIX 05/09) : le contexte était 100% statique —
    // la Direction enregistrait (updateBranding) mais rien ne lisait. On charge
    // la config de l'entreprise connectée (lecture seule, même tenant).
    // Page publique de collecte (non connectée) : le contexte garde les
    // défauts, c'est CollectePage qui utilise formDef.brandConfig du guichet.
    const { data: brandingServeur } = useQuery(getBranding, undefined, { enabled: !!user?.id_entreprise });
    const brandConfig = useMemo(() => {
        const s = brandingServeur;
        if (!s)
            return BRANDING;
        // Fusion CHAMPS TEXTE uniquement : les couleurs serveur sont en HEX
        // (#RRGGBB) alors que le thème attend du HSL (« H S% L% ») — les appliquer
        // brutes casserait tout le CSS. Textes + logo + favicon : sûrs.
        const texte = (v, defaut) => typeof v === 'string' && v.trim() ? v : defaut;
        return {
            ...BRANDING,
            platform_name: texte(s.nom_affiche, BRANDING.platform_name),
            logo_url: s.logo_url ?? BRANDING.logo_url,
            favicon_url: s.favicon_url ?? BRANDING.favicon_url,
            form_title: texte(s.form_title, BRANDING.form_title),
            form_subtitle: texte(s.form_subtitle, BRANDING.form_subtitle),
            form_thank_you: texte(s.form_thank_you, BRANDING.form_thank_you),
            qr_slogan: texte(s.qr_slogan, BRANDING.qr_slogan),
            hide_yeba_branding: !!s.hide_yeba_branding,
            // QR : style/cadre en MAJUSCULES validées, couleurs HEX validées —
            // une valeur invalide retombe sur le défaut (jamais de QR illisible).
            qr_style: ['CLASSIQUE', 'MODERNE', 'PREMIUM'].includes(String(s.qr_style)) ? s.qr_style : BRANDING.qr_style,
            qr_frame: ['AUCUN', 'SIMPLE', 'PREMIUM'].includes(String(s.qr_frame)) ? s.qr_frame : BRANDING.qr_frame,
            qr_color: /^#[0-9a-fA-F]{6}$/.test(String(s.qr_color ?? '')) ? s.qr_color : null,
            qr_bg_color: /^#[0-9a-fA-F]{6}$/.test(String(s.qr_bg_color ?? '')) ? s.qr_bg_color : null,
        };
    }, [brandingServeur]);
    return (<BrandContext.Provider value={{ brandConfig, isLoading: false }}>
      <AppliqueThemeMarque brandConfig={brandConfig}/>
      {children}
    </BrandContext.Provider>);
};
/** Effets DOM du thème (ombres, favicon, titre) — séparés pour ne pas
 *  re-déclencher le fetch de personnalisation. */
function AppliqueThemeMarque({ brandConfig, children }) {
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
        }
        else if (BRANDING.shadow_style === 'SHARP') {
            shadowStyles = `
        --shadow-premium: 4px 4px 0px 0px hsl(${BRANDING.color_foreground} / 0.15);
        --shadow-card: 2px 2px 0px 0px hsl(${BRANDING.color_foreground} / 0.1);
        --shadow-premium-lg: 6px 6px 0px 0px hsl(${BRANDING.color_foreground} / 0.2);
      `;
        }
        else if (BRANDING.shadow_style === 'GLOW') {
            shadowStyles = `
        --shadow-premium: 0 0 15px hsl(${BRANDING.color_primary} / 0.12);
        --shadow-card: 0 0 10px hsl(${BRANDING.color_primary} / 0.08);
        --shadow-premium-lg: 0 0 25px hsl(${BRANDING.color_primary} / 0.18);
      `;
        }
        else {
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
        /* Injection CSS : seule la palette mode clair est injectée ici.
           La palette mode sombre (.dark) vit exclusivement dans Main.css et
           n'est PAS écrasée par branding.ts — cela évite le bug critique où
           des valeurs sombres se retrouvaient appliquées en mode clair. */
        styleElement.innerHTML = `
      ${BRANDING.font_url ? `@import url('${BRANDING.font_url}');` : ''}
      :root:not(.dark) {
        --background: ${BRANDING.color_background};
        --foreground: ${BRANDING.color_foreground};
        --card: ${BRANDING.color_card};
        --card-foreground: ${BRANDING.color_card_foreground};
        --card-accent: ${BRANDING.color_accent};
        --card-accent-foreground: ${BRANDING.color_accent_foreground};
        --card-subtle: ${BRANDING.color_muted};
        --card-subtle-foreground: ${BRANDING.color_muted_foreground};
        --popover: ${BRANDING.color_popover};
        --popover-foreground: ${BRANDING.color_popover_foreground};
        --primary: ${BRANDING.color_primary};
        --primary-foreground: ${BRANDING.color_primary_foreground};
        --secondary: ${BRANDING.color_secondary};
        --secondary-foreground: ${BRANDING.color_secondary_foreground};
        --secondary-muted: ${BRANDING.color_secondary_muted};
        --secondary-muted-foreground: ${BRANDING.color_secondary_muted_foreground};
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
        if (brandConfig.favicon_url) {
            let faviconElement = document.querySelector("link[rel*='icon']");
            if (!faviconElement) {
                faviconElement = document.createElement('link');
                faviconElement.rel = 'shortcut icon';
                document.head.appendChild(faviconElement);
            }
            faviconElement.href = brandConfig.favicon_url;
        }
        // Mettre à jour le titre du document si on est hors de la landing page
        if (window.location.pathname !== '/' && brandConfig.platform_name) {
            document.title = `${brandConfig.platform_name} — Satisfaction`;
        }
    }, [brandConfig]);
    return <>{children}</>;
}
;
