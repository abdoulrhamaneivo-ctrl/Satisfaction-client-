import React, { useState, useEffect } from 'react';
import { useQuery, useAction, getBrandConfig, upsertBrandConfig } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Loader2, Palette, Type, Image as ImageIcon, Sparkles, Sliders, Layout, Eye, Save, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { RequireAuth } from '../components/RequireAuth';
import { AmbientBackground } from '../components/AmbientBackground';

// --- HELPERS DE CONVERSION DE COULEURS ---

function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

function parseHslString(hslStr: string): { h: number; s: number; l: number } {
  const parts = hslStr.trim().split(/\s+/);
  const h = parseInt(parts[0]) || 0;
  const s = parseInt(parts[1]?.replace('%', '')) || 0;
  const l = parseInt(parts[2]?.replace('%', '')) || 0;
  return { h, s, l };
}

function hslStringToHex(hslStr: string): string {
  const { h, s, l } = parseHslString(hslStr);
  return hslToHex(h, s, l);
}

// --- CONTRASTE AUTOMATIQUE (accessibilité) ---
// Recommandation classique en marque blanche : si le client choisit un
// jaune vif comme couleur primaire, le texte par-dessus doit basculer sur
// du noir automatiquement ; s'il choisit un bleu marine, sur du blanc.
// Sans ça, un client sans œil de designer peut très facilement se
// retrouver avec du texte illisible sur ses propres boutons. On calcule la
// luminance relative WCAG de la couleur de fond et on choisit le texte
// (quasi-noir ou quasi-blanc) qui offre le meilleur contraste.
function getContrastingForegroundHsl(hslStr: string): string {
  const { h, s, l } = parseHslString(hslStr);
  const hex = hslToHex(h, s, l);
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  // Seuil 0.5 (plutôt que 0.179 recommandé pour un contraste AA strict
  // texte/fond) : volontairement plus prudent pour rester lisible même sur
  // des teintes moyennes (orange vif, bleu ciel...) où un blanc pur serait
  // techniquement "conforme" mais visuellement fade.
  return luminance > 0.5 ? '0 0% 9%' : '0 0% 98%';
}

// Paires fond → texte recalculées automatiquement quand le client choisit
// une des 4 couleurs réellement exposées dans l'éditeur (voir plus bas :
// on limite volontairement les sélecteurs à Primaire/Secondaire/Fond/Cartes
// pour éviter le chaos d'un client qui ajusterait 15 curseurs sans avoir
// l'œil d'un designer — les déclinaisons et contrastes sont déduits).
const AUTO_CONTRAST_PAIRS: Partial<Record<keyof typeof PRESETS[0]['colors'], keyof typeof PRESETS[0]['colors']>> = {
  color_primary: 'color_primary_foreground',
  color_secondary: 'color_secondary_foreground',
  color_background: 'color_foreground',
  color_card: 'color_card_foreground',
};

// --- THÈMES PRÉDÉFINIS EN UN CLIC ---

const PRESETS = [
  {
    name: 'CXSAT (Orange & Bleu)',
    colors: {
      color_background: '40 20% 98.5%',
      color_foreground: '0 0% 3.9%',
      color_card: '40 20% 99%',
      color_card_foreground: '0 0% 3.9%',
      color_popover: '0 0% 100%',
      color_popover_foreground: '0 0% 3.9%',
      color_primary: '210 100% 13%',
      color_primary_foreground: '0 0% 98%',
      color_secondary: '32 100% 37%',
      color_secondary_foreground: '0 0% 9%',
      color_accent: '33 74% 62%',
      color_accent_foreground: '0 0% 98%',
      color_muted: '0 0% 96.1%',
      color_muted_foreground: '0 0% 38%',
      color_destructive: '0 84.2% 60.2%',
      color_destructive_foreground: '0 0% 98%',
      color_success: '141 71% 48%',
      color_success_foreground: '0 0% 98%',
      color_warning: '36 100% 50%',
      color_warning_foreground: '0 0% 98%',
      color_border: '0 0% 89.8%',
      color_input: '0 0% 89.8%',
      color_ring: '0 0% 3.9%',
    }
  },
  {
    name: 'Émeraude Zen (Vert Forestier)',
    colors: {
      color_background: '100 20% 98%',
      color_foreground: '160 50% 10%',
      color_card: '100 20% 99%',
      color_card_foreground: '160 50% 10%',
      color_popover: '0 0% 100%',
      color_popover_foreground: '160 50% 10%',
      color_primary: '158 64% 15%',
      color_primary_foreground: '0 0% 98%',
      color_secondary: '145 63% 32%',
      color_secondary_foreground: '0 0% 98%',
      color_accent: '142 72% 45%',
      color_accent_foreground: '0 0% 98%',
      color_muted: '150 20% 95%',
      color_muted_foreground: '150 20% 40%',
      color_destructive: '0 84% 60%',
      color_destructive_foreground: '0 0% 98%',
      color_success: '142 72% 45%',
      color_success_foreground: '0 0% 98%',
      color_warning: '38 92% 50%',
      color_warning_foreground: '0 0% 98%',
      color_border: '150 20% 88%',
      color_input: '150 20% 88%',
      color_ring: '158 64% 15%',
    }
  },
  {
    name: 'Océan Indigo (Bleu Cobalt & Azur)',
    colors: {
      color_background: '210 40% 98%',
      color_foreground: '222 47% 11%',
      color_card: '210 40% 99%',
      color_card_foreground: '222 47% 11%',
      color_popover: '0 0% 100%',
      color_popover_foreground: '222 47% 11%',
      color_primary: '222 89% 18%',
      color_primary_foreground: '210 40% 98%',
      color_secondary: '201 96% 32%',
      color_secondary_foreground: '0 0% 98%',
      color_accent: '190 90% 45%',
      color_accent_foreground: '222 47% 11%',
      color_muted: '210 40% 96.1%',
      color_muted_foreground: '215 16% 47%',
      color_destructive: '0 84.2% 60.2%',
      color_destructive_foreground: '0 0% 98%',
      color_success: '142 72% 45%',
      color_success_foreground: '0 0% 98%',
      color_warning: '38 92% 50%',
      color_warning_foreground: '0 0% 98%',
      color_border: '214.3 31.8% 91.4%',
      color_input: '214.3 31.8% 91.4%',
      color_ring: '222.2 84% 4.9%',
    }
  },
  {
    name: 'Royal Gold (Premium Noir & Or)',
    colors: {
      color_background: '0 0% 99%',
      color_foreground: '0 0% 9%',
      color_card: '0 0% 100%',
      color_card_foreground: '0 0% 9%',
      color_popover: '0 0% 100%',
      color_popover_foreground: '0 0% 9%',
      color_primary: '0 0% 8%',
      color_primary_foreground: '43 96% 89%',
      color_secondary: '43 96% 40%',
      color_secondary_foreground: '0 0% 98%',
      color_accent: '43 80% 55%',
      color_accent_foreground: '0 0% 8%',
      color_muted: '0 0% 96%',
      color_muted_foreground: '0 0% 40%',
      color_destructive: '0 84.2% 60.2%',
      color_destructive_foreground: '0 0% 98%',
      color_success: '142 72% 45%',
      color_success_foreground: '0 0% 98%',
      color_warning: '38 92% 50%',
      color_warning_foreground: '0 0% 98%',
      color_border: '0 0% 89.8%',
      color_input: '0 0% 89.8%',
      color_ring: '43 96% 40%',
    }
  }
];

const FONTS = [
  { name: 'Satoshi', url: '' },
  { name: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap' },
  { name: 'Outfit', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap' },
  { name: 'Playfair Display', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Plus Jakarta Sans', url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap' },
];

export const BrandConfigPage = () => {
  const { data: user } = useAuth();
  const { data: dbConfig, isLoading: loadingConfig, refetch } = useQuery(getBrandConfig, {});
  const updateBrand = useAction(upsertBrandConfig);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'info' | 'colors' | 'style' | 'texts'>('info');

  // --- ÉTATS DU FORMULAIRE ---
  const [platformName, setPlatformName] = useState('CXSAT');
  const [platformDescription, setPlatformDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  
  // Couleurs en HSL strings
  const [colors, setColors] = useState({
    color_background: '40 20% 98.5%',
    color_foreground: '0 0% 3.9%',
    color_card: '40 20% 99%',
    color_card_foreground: '0 0% 3.9%',
    color_popover: '0 0% 100%',
    color_popover_foreground: '0 0% 3.9%',
    color_primary: '210 100% 13%',
    color_primary_foreground: '0 0% 98%',
    color_secondary: '32 100% 37%',
    color_secondary_foreground: '0 0% 9%',
    color_accent: '33 74% 62%',
    color_accent_foreground: '0 0% 98%',
    color_muted: '0 0% 96.1%',
    color_muted_foreground: '0 0% 38%',
    color_destructive: '0 84.2% 60.2%',
    color_destructive_foreground: '0 0% 98%',
    color_success: '141 71% 48%',
    color_success_foreground: '0 0% 98%',
    color_warning: '36 100% 50%',
    color_warning_foreground: '0 0% 98%',
    color_border: '0 0% 89.8%',
    color_input: '0 0% 89.8%',
    color_ring: '0 0% 3.9%',
  });

  const [borderRadius, setBorderRadius] = useState('0.5rem');
  const [shadowStyle, setShadowStyle] = useState('DEFAULT');
  const [fontFamily, setFontFamily] = useState('Satoshi');
  const [fontUrl, setFontUrl] = useState<string | null>('');

  const [formTitle, setFormTitle] = useState('Votre avis compte !');
  const [formSubtitle, setFormSubtitle] = useState('Notez-nous en 10 secondes après votre passage');
  const [formThankYou, setFormThankYou] = useState('Merci pour votre avis !');
  const [qrSlogan, setQrSlogan] = useState('Scannez ce QR Code');
  const [ussdHelpText, setUssdHelpText] = useState('Pas de connexion internet ?');
  const [hideCxsatBranding, setHideCxsatBranding] = useState(false);

  const [saving, setSaving] = useState(false);

  // Charger les données de la DB au démarrage
  useEffect(() => {
    if (dbConfig) {
      setPlatformName(dbConfig.platform_name);
      setPlatformDescription(dbConfig.platform_description);
      setLogoUrl(dbConfig.logo_url);
      setLogoDarkUrl(dbConfig.logo_dark_url);
      setFaviconUrl(dbConfig.favicon_url);
      setBorderRadius(dbConfig.border_radius);
      setShadowStyle(dbConfig.shadow_style);
      setFontFamily(dbConfig.font_family);
      setFontUrl(dbConfig.font_url);
      setFormTitle(dbConfig.form_title);
      setFormSubtitle(dbConfig.form_subtitle);
      setFormThankYou(dbConfig.form_thank_you);
      setQrSlogan(dbConfig.qr_slogan);
      setUssdHelpText(dbConfig.ussd_help_text);
      setHideCxsatBranding(dbConfig.hide_cxsat_branding);

      setColors({
        color_background: dbConfig.color_background,
        color_foreground: dbConfig.color_foreground,
        color_card: dbConfig.color_card,
        color_card_foreground: dbConfig.color_card_foreground,
        color_popover: dbConfig.color_popover,
        color_popover_foreground: dbConfig.color_popover_foreground,
        color_primary: dbConfig.color_primary,
        color_primary_foreground: dbConfig.color_primary_foreground,
        color_secondary: dbConfig.color_secondary,
        color_secondary_foreground: dbConfig.color_secondary_foreground,
        color_accent: dbConfig.color_accent,
        color_accent_foreground: dbConfig.color_accent_foreground,
        color_muted: dbConfig.color_muted,
        color_muted_foreground: dbConfig.color_muted_foreground,
        color_destructive: dbConfig.color_destructive,
        color_destructive_foreground: dbConfig.color_destructive_foreground,
        color_success: dbConfig.color_success,
        color_success_foreground: dbConfig.color_success_foreground,
        color_warning: dbConfig.color_warning,
        color_warning_foreground: dbConfig.color_warning_foreground,
        color_border: dbConfig.color_border,
        color_input: dbConfig.color_input,
        color_ring: dbConfig.color_ring,
      });
    }
  }, [dbConfig]);

  const handleColorChange = (key: keyof typeof colors, hexValue: string) => {
    const hsl = hexToHsl(hexValue);
    setColors(prev => {
      const next = { ...prev, [key]: hsl };
      const pairedForegroundKey = AUTO_CONTRAST_PAIRS[key];
      if (pairedForegroundKey) {
        next[pairedForegroundKey] = getContrastingForegroundHsl(hsl);
      }
      return next;
    });
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setColors(preset.colors);
    toast({
      title: 'Thème appliqué',
      description: `La palette "${preset.name}" a été chargée.`,
    });
  };

  const handleFontSelect = (font: typeof FONTS[0]) => {
    setFontFamily(font.name);
    setFontUrl(font.url || null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'logo_dark' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 150 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Fichier trop lourd',
        description: 'Veuillez uploader un logo de moins de 150 Ko.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (target === 'logo') setLogoUrl(base64String);
      if (target === 'logo_dark') setLogoDarkUrl(base64String);
      if (target === 'favicon') setFaviconUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBrand({
        platform_name: platformName,
        platform_description: platformDescription,
        logo_url: logoUrl,
        logo_dark_url: logoDarkUrl,
        favicon_url: faviconUrl,
        border_radius: borderRadius,
        shadow_style: shadowStyle as any,
        font_family: fontFamily,
        font_url: fontUrl,
        form_title: formTitle,
        form_subtitle: formSubtitle,
        form_thank_you: formThankYou,
        qr_slogan: qrSlogan,
        ussd_help_text: ussdHelpText,
        hide_cxsat_branding: hideCxsatBranding,
        ...colors
      });
      toast({
        title: 'Configuration sauvegardée !',
        description: 'L\'identité visuelle de votre entreprise a été mise à jour.',
      });
      refetch();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la sauvegarde',
        description: err?.message || 'Une erreur inattendue est survenue.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Correctif : contrairement aux autres pages d'administration
  // (GestionAgencesPage, AdminPersonnelPage...), cette page n'était protégée
  // ni par <RequireAuth> ni par une vérification de rôle — elle était donc
  // consultable en URL directe par un utilisateur non connecté ou par un
  // CHEF_AGENCE/AGENT, qui pouvait remplir tout le formulaire avant de
  // découvrir l'erreur 403 seulement au clic sur "Enregistrer" (voir
  // upsertBrandConfig, désormais réservé à DIRECTION/QUALITE côté serveur).
  if (user && user.role !== 'DIRECTION' && user.role !== 'QUALITE') {
    return (
      <RequireAuth>
        <AmbientBackground>
          <div className="flex min-h-screen items-center justify-center p-8">
            <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl border border-border/70 bg-card p-10 text-center shadow-premium">
              <ShieldAlert className="size-10 text-warning" />
              <h1 className="text-lg font-bold">Accès réservé à la direction</h1>
              <p className="text-sm text-muted-foreground">
                La charte graphique s'applique à toute l'entreprise. Seule la Direction (ou un
                Auditeur Qualité) peut la modifier.
              </p>
            </div>
          </div>
        </AmbientBackground>
      </RequireAuth>
    );
  }

  if (loadingConfig) {
    return (
      <RequireAuth>
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-neutral-500">Chargement de la marque...</p>
        </div>
      </RequireAuth>
    );
  }

  // Styles temporaires appliqués à la preview droite via style inline
  const previewStyles = {
    '--preview-bg': `hsl(${colors.color_background})`,
    '--preview-fg': `hsl(${colors.color_foreground})`,
    '--preview-card': `hsl(${colors.color_card})`,
    '--preview-card-fg': `hsl(${colors.color_card_foreground})`,
    '--preview-primary': `hsl(${colors.color_primary})`,
    '--preview-primary-fg': `hsl(${colors.color_primary_foreground})`,
    '--preview-secondary': `hsl(${colors.color_secondary})`,
    '--preview-border': `hsl(${colors.color_border})`,
    '--preview-radius': borderRadius,
    fontFamily: fontUrl ? `'${fontFamily}', sans-serif` : 'inherit',
  } as React.CSSProperties;

  return (
    <RequireAuth>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Dynamic Font Import inside page just for the preview to work immediately */}
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" /> Personnalisation Totale (White-Label)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les couleurs, le nom et le style visuel de l'ensemble de votre espace.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-6 py-5 rounded-xl font-bold shadow-premium">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer les modifications
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* PANNEAU DE CONFIGURATION (GAUCHE) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl shadow-premium overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border/60 bg-muted/20">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-4 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'info' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sliders className="h-4 w-4" /> Plateforme
              </button>
              <button
                onClick={() => setActiveTab('colors')}
                className={`flex-1 py-4 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'colors' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Palette className="h-4 w-4" /> Couleurs
              </button>
              <button
                onClick={() => setActiveTab('style')}
                className={`flex-1 py-4 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'style' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Type className="h-4 w-4" /> Style & Police
              </button>
              <button
                onClick={() => setActiveTab('texts')}
                className={`flex-1 py-4 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'texts' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layout className="h-4 w-4" /> Textes & QR
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tab 1 : Info & Logos */}
              {activeTab === 'info' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom de la Plateforme</label>
                      <input
                        type="text"
                        value={platformName}
                        onChange={(e) => setPlatformName(e.target.value)}
                        placeholder="Ex: NSIA Satisfaction"
                        maxLength={80}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Slogan / Description</label>
                      <input
                        type="text"
                        value={platformDescription}
                        onChange={(e) => setPlatformDescription(e.target.value)}
                        placeholder="Ex: Votre avis améliore notre service"
                        maxLength={200}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-4 space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4" /> Logos & Favicon
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Logo Principal */}
                      <div className="space-y-2 border border-border/80 rounded-xl p-3 bg-muted/5">
                        <label className="text-xs font-bold block text-muted-foreground">Logo Principal (Fond clair)</label>
                        {logoUrl && (
                          <img src={logoUrl} alt="Logo preview" className="h-10 max-w-full object-contain mx-auto border rounded bg-white p-1" />
                        )}
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/svg+xml"
                          onChange={(e) => handleLogoUpload(e, 'logo')}
                          className="text-xs w-full cursor-pointer file:cursor-pointer file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold file:px-2 file:py-1 file:rounded file:mr-2"
                        />
                      </div>

                      {/* Logo Sombre */}
                      <div className="space-y-2 border border-border/80 rounded-xl p-3 bg-muted/5">
                        <label className="text-xs font-bold block text-muted-foreground">Logo Fond Sombre</label>
                        {logoDarkUrl && (
                          <img src={logoDarkUrl} alt="Logo dark preview" className="h-10 max-w-full object-contain mx-auto border rounded bg-slate-900 p-1" />
                        )}
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/svg+xml"
                          onChange={(e) => handleLogoUpload(e, 'logo_dark')}
                          className="text-xs w-full cursor-pointer file:cursor-pointer file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold file:px-2 file:py-1 file:rounded file:mr-2"
                        />
                      </div>

                      {/* Favicon */}
                      <div className="space-y-2 border border-border/80 rounded-xl p-3 bg-muted/5">
                        <label className="text-xs font-bold block text-muted-foreground">Favicon (Onglet)</label>
                        {faviconUrl && (
                          <img src={faviconUrl} alt="Favicon preview" className="h-6 w-6 object-contain mx-auto border rounded bg-white p-0.5" />
                        )}
                        <input
                          type="file"
                          accept="image/x-icon, image/png"
                          onChange={(e) => handleLogoUpload(e, 'favicon')}
                          className="text-xs w-full cursor-pointer file:cursor-pointer file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold file:px-2 file:py-1 file:rounded file:mr-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2 : Couleurs */}
              {activeTab === 'colors' && (
                <div className="space-y-6">
                  {/* Thèmes rapides */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Thèmes rapides en 1 clic</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePresetSelect(p)}
                          className="p-3 text-left border border-border rounded-xl hover:bg-muted/30 transition-all font-semibold text-xs flex justify-between items-center"
                        >
                          <span>{p.name}</span>
                          <div className="flex gap-1">
                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: `hsl(${p.colors.color_primary})` }} />
                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: `hsl(${p.colors.color_secondary})` }} />
                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: `hsl(${p.colors.color_background})` }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-4 space-y-4">
                    <h3 className="text-sm font-bold text-foreground">Éditeur de palette détaillé</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Couleur Primaire */}
                      <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                        <input
                          type="color"
                          value={hslStringToHex(colors.color_primary)}
                          onChange={(e) => handleColorChange('color_primary', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent"
                        />
                        <div className="flex-1 min-w-0">
                          <label className="text-xs font-bold block text-foreground">Primaire (Boutons, en-têtes)</label>
                          <span className="text-[10px] font-mono text-muted-foreground block">HSL: {colors.color_primary}</span>
                        </div>
                        {/* Aperçu de contraste automatique : le texte "Aa" est
                            recalculé en direct (noir ou blanc) pour rester
                            lisible, quelle que soit la couleur choisie. */}
                        <span
                          className="shrink-0 flex size-8 items-center justify-center rounded-lg text-xs font-black"
                          style={{
                            backgroundColor: `hsl(${colors.color_primary})`,
                            color: `hsl(${colors.color_primary_foreground})`,
                          }}
                          title="Aperçu du contraste texte/fond (calculé automatiquement)"
                        >
                          Aa
                        </span>
                      </div>

                      {/* Couleur Secondaire */}
                      <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                        <input
                          type="color"
                          value={hslStringToHex(colors.color_secondary)}
                          onChange={(e) => handleColorChange('color_secondary', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent"
                        />
                        <div className="flex-1 min-w-0">
                          <label className="text-xs font-bold block text-foreground">Secondaire (Accents secondaires)</label>
                          <span className="text-[10px] font-mono text-muted-foreground block">HSL: {colors.color_secondary}</span>
                        </div>
                        <span
                          className="shrink-0 flex size-8 items-center justify-center rounded-lg text-xs font-black"
                          style={{
                            backgroundColor: `hsl(${colors.color_secondary})`,
                            color: `hsl(${colors.color_secondary_foreground})`,
                          }}
                          title="Aperçu du contraste texte/fond (calculé automatiquement)"
                        >
                          Aa
                        </span>
                      </div>

                      {/* Couleur Fond Global */}
                      <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                        <input
                          type="color"
                          value={hslStringToHex(colors.color_background)}
                          onChange={(e) => handleColorChange('color_background', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent"
                        />
                        <div className="flex-1 min-w-0">
                          <label className="text-xs font-bold block text-foreground">Arrière-plan Global</label>
                          <span className="text-[10px] font-mono text-muted-foreground block">HSL: {colors.color_background}</span>
                        </div>
                        <span
                          className="shrink-0 flex size-8 items-center justify-center rounded-lg text-xs font-black border border-border/60"
                          style={{
                            backgroundColor: `hsl(${colors.color_background})`,
                            color: `hsl(${colors.color_foreground})`,
                          }}
                          title="Aperçu du contraste texte/fond (calculé automatiquement)"
                        >
                          Aa
                        </span>
                      </div>

                      {/* Couleur Fond des Cartes */}
                      <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                        <input
                          type="color"
                          value={hslStringToHex(colors.color_card)}
                          onChange={(e) => handleColorChange('color_card', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent"
                        />
                        <div className="flex-1 min-w-0">
                          <label className="text-xs font-bold block text-foreground">Cartes & Conteneurs</label>
                          <span className="text-[10px] font-mono text-muted-foreground block">HSL: {colors.color_card}</span>
                        </div>
                        <span
                          className="shrink-0 flex size-8 items-center justify-center rounded-lg text-xs font-black border border-border/60"
                          style={{
                            backgroundColor: `hsl(${colors.color_card})`,
                            color: `hsl(${colors.color_card_foreground})`,
                          }}
                          title="Aperçu du contraste texte/fond (calculé automatiquement)"
                        >
                          Aa
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3 : Style & Typographies */}
              {activeTab === 'style' && (
                <div className="space-y-5">
                  {/* Choix des coins */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Coins Arrondis (Radius)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['0rem', '0.375rem', '0.5rem', '1rem'].map((rad) => (
                        <button
                          key={rad}
                          onClick={() => setBorderRadius(rad)}
                          className={`py-2 text-center text-xs font-bold border rounded-xl transition-all ${
                            borderRadius === rad ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted/40'
                          }`}
                        >
                          {rad === '0rem' ? 'Carré' : rad === '0.375rem' ? 'Subtil' : rad === '0.5rem' ? 'Moyen' : 'Arrondi'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Choix de l'ombre */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Intensité des ombres (Shadows)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['NONE', 'DEFAULT', 'SHARP', 'GLOW'].map((sh) => (
                        <button
                          key={sh}
                          onClick={() => setShadowStyle(sh)}
                          className={`py-2 text-center text-xs font-bold border rounded-xl transition-all ${
                            shadowStyle === sh ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted/40'
                          }`}
                        >
                          {sh === 'NONE' ? 'Aucune' : sh === 'DEFAULT' ? 'CXSAT' : sh === 'SHARP' ? 'Rétro' : 'Premium'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sélection de police */}
                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Police Google Fonts</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {FONTS.map((font) => (
                        <button
                          key={font.name}
                          onClick={() => handleFontSelect(font)}
                          className={`p-3 text-left border rounded-xl transition-all flex items-center justify-between ${
                            fontFamily === font.name ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background hover:bg-muted/40'
                          }`}
                        >
                          <span className="font-semibold text-sm" style={{ fontFamily: font.name }}>{font.name}</span>
                          <span className="text-[10px] text-muted-foreground">Google Fonts</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4 : Textes d'évaluation */}
              {activeTab === 'texts' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Titre du questionnaire public</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      maxLength={150}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sous-titre du questionnaire</label>
                    <input
                      type="text"
                      value={formSubtitle}
                      onChange={(e) => setFormSubtitle(e.target.value)}
                      maxLength={200}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Message de remerciement</label>
                    <input
                      type="text"
                      value={formThankYou}
                      onChange={(e) => setFormThankYou(e.target.value)}
                      maxLength={200}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Slogan affiche QR</label>
                    <input
                      type="text"
                      value={qrSlogan}
                      onChange={(e) => setQrSlogan(e.target.value)}
                      maxLength={100}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Texte d'aide USSD (sans internet)</label>
                    <input
                      type="text"
                      value={ussdHelpText}
                      onChange={(e) => setUssdHelpText(e.target.value)}
                      placeholder="Ex: Pas de connexion internet ?"
                      maxLength={150}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/5 mt-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">Masquer le filigrane "Propulsé par CXSAT"</span>
                      <span className="text-[10px] text-muted-foreground">Supprime le bandeau de marque en bas du formulaire d'évaluation public.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={hideCxsatBranding}
                      onChange={(e) => setHideCxsatBranding(e.target.checked)}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PRÉVISUALISATION LIVE EN TEMPS RÉEL (DROITE) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> Prévisualisation Mobile & Affiche
            </h3>

            {/* Téléphone Mobile Preview */}
            <div 
              style={previewStyles}
              className="mx-auto w-full max-w-[340px] h-[580px] bg-[var(--preview-bg)] text-[var(--preview-fg)] rounded-[2.5rem] border-[12px] border-slate-900 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4 transition-all duration-300"
            >
              {/* Speaker & camera mockup */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-full flex items-center justify-center gap-1.5 z-50">
                <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                <div className="w-10 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* Status bar */}
              <div className="flex justify-between items-center text-[10px] font-bold text-[var(--preview-fg)] opacity-60 px-4 pt-1">
                <span>09:41</span>
                <div className="flex items-center gap-1">
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* En-tête application */}
              <div className="flex items-center justify-between border-b border-[var(--preview-border)] pb-2 pt-2 px-1">
                <span className="text-[10px] font-bold opacity-60">Retour</span>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-5 max-w-[80px] object-contain" />
                ) : (
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--preview-primary)]">
                    {platformName}
                  </span>
                )}
              </div>

              {/* Corps principal (Simule CollectePage) */}
              <div className="flex-1 flex items-center justify-center py-4">
                <div 
                  className="w-full bg-[var(--preview-card)] text-[var(--preview-card-fg)] p-4 border border-[var(--preview-border)] rounded-[var(--preview-radius)] text-center space-y-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold leading-tight">
                      {formTitle}
                    </h4>
                    <p className="text-[10px] opacity-70">
                      {formSubtitle}
                    </p>
                  </div>

                  {/* Smileys fictifs */}
                  <div className="flex justify-around gap-1 pt-2">
                    {['😡', '😟', '😐', '🙂', '🤩'].map((emoji, i) => (
                      <span 
                        key={i} 
                        className={`text-2xl p-1.5 rounded-full border border-transparent transition-all cursor-pointer ${
                          i === 4 ? 'bg-[var(--preview-primary)]/10 scale-110' : ''
                        }`}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>

                  <p className="text-[9px] opacity-40">Votre avis est strictement anonyme</p>
                </div>
              </div>

              {/* Bouton d'action custom */}
              <div className="px-2 pb-2">
                <button 
                  style={{
                    backgroundColor: `hsl(${colors.color_primary})`,
                    color: `hsl(${colors.color_primary_foreground})`,
                    borderRadius: borderRadius,
                  }}
                  className="w-full py-2.5 text-xs font-bold shadow-md transition-all"
                >
                  Continuer
                </button>
              </div>

              {/* Footer */}
              {!hideCxsatBranding ? (
                <div className="text-center pb-1 pt-2 border-t border-[var(--preview-border)]/30">
                  <span className="text-[8px] font-bold opacity-40 uppercase tracking-widest">
                    Propulsé par {platformName}
                  </span>
                </div>
              ) : (
                <div className="h-4" />
              )}
            </div>

            {/* Affiche QR Mini Preview */}
            <div 
              style={previewStyles}
              className="bg-white text-neutral-900 rounded-xl border border-neutral-200 p-4 shadow-md max-w-[340px] mx-auto text-center space-y-3"
            >
              <div className="flex items-center justify-center gap-1.5 border-b pb-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-5 max-w-[60px] object-contain" />
                ) : (
                  <span className="text-[10px] font-black uppercase text-neutral-500">{platformName}</span>
                )}
              </div>
              <h5 className="text-sm font-extrabold text-neutral-900 leading-tight">
                {formTitle}
              </h5>
              <div className="w-20 h-20 bg-neutral-100 rounded-lg border-2 border-neutral-900 mx-auto flex items-center justify-center text-lg">
                QR
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                {qrSlogan}
              </p>
              <div className="bg-neutral-50 rounded-lg py-1 px-2 border">
                <span className="text-[9px] font-semibold text-neutral-500">{ussdHelpText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </RequireAuth>
  );
};
export default BrandConfigPage;
