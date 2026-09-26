export declare const BRANDING: {
    platform_name: string;
    platform_description: string;
    logo_url: string;
    logo_dark_url: null;
    favicon_url: null;
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
    color_secondary_muted: string;
    color_secondary_muted_foreground: string;
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
    color_primary_strong: string;
    color_success_strong: string;
    color_warning_strong: string;
    color_destructive_strong: string;
    color_ring: string;
    color_border: string;
    color_input: string;
    border_radius: string;
    shadow_style: string;
    font_family: string;
    font_url: null;
    form_title: string;
    form_subtitle: string;
    form_thank_you: string;
    qr_slogan: string;
    ussd_help_text: string;
    hide_yeba_branding: boolean;
    qr_style: string;
    qr_frame: string;
    qr_color: null;
    qr_bg_color: null;
};
export type BrandConfigType = typeof BRANDING;
/** HSL « H S% L% » → luminance relative WCAG. */
export declare function luminanceHsl(token: string): number;
/** Ratio de contraste WCAG entre deux tokens HSL. */
export declare function ratioContrasteHsl(a: string, b: string): number;
/**
 * Un fond de page white-label est accepté s'il reste une SURFACE CLAIRE
 * capable de porter la palette mode clair.
 *
 * Deux conditions, toutes deux nécessaires :
 *  - le texte par défaut (`color_foreground`, quasi noir) doit atteindre
 *    4,5:1 sur ce fond, sinon lesLabels de l'entreprise deviennent
 *    eux-mêmes illisibles ;
 *  - le fond doit rester clair (luminance > 0,5). L'application ne
 *    définit qu'une seule palette mode clair (le mode sombre du
 *    dashboard est un thème local, jamais celui du formulaire public) :
 *    un fond sombre casserait d'un coup les quatre variantes `-strong`,
 *    l'anneau de focus et les bordures, sans qu'on puisse les recalculer
 *    côté tenant.
 *
 * Un fond rejeté est ignoré : l'application retombe sur la charte Yéba.
 * Mieux vaut ignorer une personnalisation non conforme que servir une
 * page illisible — le contrat de lisibilité prime sur la personnalisation.
 */
export declare function fondWhiteLabelRecevable(fond: string | null | undefined, texteParDefaut: string): boolean;
/**
 * Variante « texte » d'une couleur primaire personnalisée.
 *
 * Le tenant choisit sa teinte d'aplat ; l'application en déduit la
 * variante d'usage en texte, en assombrissant la teinte jusqu'à atteindre
 * le ratio visé sur le fond réel. La teinte de marque n'est donc jamais
 * modifiée (l'aplat reste celui du client), mais tout texte porté par
 * cette couleur redevient lisible — y compris l'anneau de focus, qui
 * doit contraster à 3:1.
 */
export declare function varianteTextePourFond(primaire: string, fond: string, ratioVise?: number, clarteMinimale?: number): string;
/**
 * Couleur de texte d'un aplat personnalisé (Vague 4 — WCAG 2.2 AA 1.4.3).
 *
 * Les garde-fous ci-dessus traitent le texte de la MARQUE sur fond clair
 * et l'anneau de focus, mais pas l'autre moitié du problème : le LIBELLÉ
 * posé sur l'aplat du tenant. Un blanc sur un jaune pâle plafonne à
 * 1,6:1, et aucun calcul de contraste ne rattrape un choix de teinte.
 *
 * On ne peut pas assombrir l'aplat sans détruire l'identité visuelle du
 * client. Le levier correct est donc l'autre terme du couple : on renvoie
 * le noir des jetons (18,9:1) dès que le blanc ne passe pas le seuil, ce
 * qui préserve la teinte du client et rend le texte lisible.
 */
export declare function foregroundPourAplat(primaire: string, seuil?: number): string;
//# sourceMappingURL=branding.d.ts.map