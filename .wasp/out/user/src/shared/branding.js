export const BRANDING = {
    platform_name: "Yéba",
    platform_description: "Plateforme de collecte et de pilotage de la satisfaction client au guichet",
    logo_url: "/yeba-logo.svg",
    logo_dark_url: null,
    favicon_url: null,
    /* ── Palette Mode Clair (défaut) ──
       Fond crème + vert postal + jaune doré.
       Ces valeurs sont injectées par BrandContext dans :root:not(.dark). */
    color_background: "40 30% 96%",
    color_foreground: "216 40% 12%",
    color_card: "0 0% 100%",
    color_card_foreground: "216 40% 12%",
    color_popover: "0 0% 100%",
    color_popover_foreground: "216 40% 12%",
    /* `--poste-vert` du Doc 04 §2.1 : « Primaire : boutons pleins,
       en-têtes, liens, texte sur blanc » — mesuré 4,77:1 avec le blanc,
       donc AA pour le texte normal. Le Doc 04 est la source unique de vérité
       couleur et interdit tout code qui en choisirait une autre ; le vert
       vif #00A851 qui figurait ici n'était NI #00843D NI le vert clair
       #00B050, c'est-à-dire hors charte. Il reste défini à part dans
       Main.css (`--brand-green`) pour les halos décoratifs, seul usage que
       le Doc 04 accorde au vert clair. */
    color_primary: "148 100% 26%",
    color_primary_foreground: "0 0% 100%",
    /* Secondaire : un cran plus sombre que le primaire, pour que les deux
       rôles restent distinguables (17 aplats + graphiques radar/aire) tout
       en gardant le blanc lisible dessus (7,11:1). */
    color_secondary: "152 100% 20%",
    color_secondary_foreground: "0 0% 98%",
    color_secondary_muted: "149 30% 90%",
    color_secondary_muted_foreground: "216 53% 24%",
    color_accent: "149 60% 92%",
    color_accent_foreground: "149 90% 26%",
    color_muted: "216 16% 93%",
    color_muted_foreground: "216 14% 42%",
    color_destructive: "0 72% 51%",
    color_destructive_foreground: "0 0% 98%",
    color_success: "149 80% 34%",
    color_success_foreground: "0 0% 98%",
    color_warning: "45 100% 50%",
    color_warning_foreground: "216 40% 12%",
    /* ── Variantes « texte » (Vague 4 — WCAG 2.2 AA 1.4.3) ──
       Avec le primaire Doc 04 (#00843D), le blanc sur aplat est conforme
       (4,77:1). En revanche le MÊME vert utilisé comme TEXTE sur fond clair
       plafonne à 4,41:1 sur la crème — sous le seuil de 4,5:1. Ces quatre
       jetons sont des assombrissements de la même famille, réservés à
       l'usage en texte, y compris sur les fonds teintés.
       Ils sont calibrés sur le PIRE CAS RÉEL, pas sur le fond de page : le
       texte d'une option sélectionnée est posé sur un aplat de teinte à
       25 % d'opacité, c'est-à-dire une teinte composite sur la crème.
       Mesurés sur les quatre jetons, ces combinaisons plafonnaient entre
       3,85:1 et 4,30:1 — sous le seuil, sur le parcours public (options
       « Oui / Non » sélectionnées). Les valeurs ci-dessous portent le pire
       cas à 4,69:1 minimum.
       Vérifié par src/shared/branding.test.ts, qui compose réellement
       l'opacité sur le fond au lieu de raisonner sur la teinte seule. */
    color_primary_strong: "148 100% 20%",
    color_success_strong: "147 76% 24%",
    color_warning_strong: "39 100% 27%",
    color_destructive_strong: "0 72% 38%",
    /* Anneau de focus : 3:1 minimum exigé (1.4.11 / 2.4.11). Le vert de
       marque à 40 % d'opacité ne montait qu'à 1,58:1 — invisible au clavier. */
    color_ring: "152 100% 22%",
    color_border: "216 16% 88%",
    color_input: "216 16% 84%",
    border_radius: "0.75rem",
    shadow_style: "DEFAULT",
    font_family: "Satoshi",
    font_url: null,
    form_title: "Votre avis compte !",
    form_subtitle: "Notez-nous en 10 secondes après votre passage",
    form_thank_you: "Merci pour votre avis !",
    qr_slogan: "Scannez ce QR Code",
    ussd_help_text: "Pas de connexion internet ?",
    hide_yeba_branding: false,
    // Personnalisation QR (table BrandingConfig) : valeurs par défaut quand
    // l'entreprise n'a rien configuré. Voir KitGuichet pour le rendu.
    qr_style: "CLASSIQUE",
    qr_frame: "SIMPLE",
    qr_color: null,
    qr_bg_color: null,
};
/* ============================================================================
 * Vague 4 — Garde-fous de contraste pour le white-label (WCAG 2.2 AA 1.4.3)
 * ============================================================================
 * Un tenant peut surcharger `color_primary` et `color_background`
 * (BrandingConfig, fusion contrôlée dans `src/server/queries.ts`). Sans
 * garde-fou, ces deux champs dérogent implicitement aux mesures de
 * contraste ci-dessus : un fond sombre, ou un primaire trop clair, rend
 * tous les jetons texte — et l'anneau de focus — non conformes, sans
 * qu'aucun test ne le voie (les tests de contraste portent sur BRANDING,
 * pas sur la valeur effectivement injectée).
 *
 * Les deux fonctions ci-dessous sont pures et testées : elles rendent la
 * règle de contraste vérifiable quelle que soit la valeur du tenant.
 * */
/** HSL « H S% L% » → luminance relative WCAG. */
export function luminanceHsl(token) {
    const [h, s, l] = token.split(' ').map((partie) => parseFloat(partie));
    const saturation = s / 100;
    const clarte = l / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = saturation * Math.min(clarte, 1 - clarte);
    const f = (n) => clarte - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const [r, v, b] = [f(0), f(8), f(4)].map((canal) => canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * v + 0.0722 * b;
}
/** Ratio de contraste WCAG entre deux tokens HSL. */
export function ratioContrasteHsl(a, b) {
    const [claire, sombre] = [luminanceHsl(a), luminanceHsl(b)].sort((x, y) => y - x);
    return (claire + 0.05) / (sombre + 0.05);
}
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
export function fondWhiteLabelRecevable(fond, texteParDefaut) {
    if (!fond || !/^\s*[\d.]+\s+[\d.]+%\s+[\d.]+%\s*$/.test(fond))
        return false;
    if (ratioContrasteHsl(texteParDefaut, fond) < 4.5)
        return false;
    return luminanceHsl(fond) > 0.5;
}
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
export function varianteTextePourFond(primaire, fond, ratioVise = 4.5, clarteMinimale = 12) {
    const [h, s, l] = primaire.split(' ').map((partie) => parseFloat(partie));
    let clarte = l;
    for (let i = 0; i < 60; i += 1) {
        const candidat = `${h} ${s}% ${clarte.toFixed(2)}%`;
        if (ratioContrasteHsl(candidat, fond) >= ratioVise)
            return candidat;
        if (clarte <= clarteMinimale)
            break;
        // Assombrissement progressif : on privilégie la teinte du client, on ne
        // touche qu'à la clarté, et le plus petit changement possible.
        clarte = Math.max(clarteMinimale, clarte * 0.92);
    }
    return `${h} ${s}% ${clarteMinimale}%`;
}
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
export function foregroundPourAplat(primaire, seuil = 4.5) {
    const blanc = '0 0% 100%';
    if (ratioContrasteHsl(blanc, primaire) >= seuil)
        return blanc;
    // Noir de la charte (Doc 04 §2.2) : l'option la plus contrastée possible
    // tout en restant un noir neutre, pas une teinte de la marque.
    return '216 40% 12%';
}
