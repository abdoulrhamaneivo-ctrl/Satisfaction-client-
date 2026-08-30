# YEBA — Design System : grammaire Mint transposée
## Doc 03 — Le langage du template Mint appliqué au design system existant (shadcn + ds/)

> **Principe (décision 00-INDEX §3)** : on TRANSPOSE la grammaire visuelle du template Mint (`design-template/`) DANS le design system existant. On ne remplace ni shadcn/ui ni `components/ds/` — on applique les règles de composition, de typographie et d'interaction de Mint.
> **Sources** : `design-template/Mint - Portfolio React Template/src/` (navbar.scss, hero.scss, footer.scss, button.scss, App.scss) + tokens existants de `src/client/Main.css`.

---

## 1. Les 8 règles de grammaire Mint (à respecter sur TOUT écran public)

1. **Navbar fixe blanche, deux états** : non scrollée = généreuse (padding py-4, logo 40px) ; scrollée = compacte (py-1.5, logo 32px, ombre douce). Transition 0.3s ease. (desktop-nav.jsx + navbar.scss `.extraLargeNavbar`)
2. **Liens de navigation UPPERCASE**, `tracking-wide`, poids medium, texte noir → survol **jaune `--warning` (#FFD100)**. Jamais de fond au survol sur les liens.
3. **Menu mobile : drawer NOIR glissant depuis la droite** (fond `--poste-noir`, liens blancs 2xl hover jaune) + **backdrop noir 80%**. Largeur 100% ≤520px, 2/3 au-dessus. (mobile-nav.scss + backdrop.scss)
4. **Boutons « à bordure inversée »** : fond plein accent + bordure 2px même couleur → au survol **fond transparent, bordure conservée** (le texte prend la couleur de l'accent). Classes utilitaires `.btn-mint` (jaune/texte noir) et `.btn-mint-vert` (vert/texte blanc) ajoutées à Main.css. Le CTA d'envoi critique conserve le glow doré `.glow-gold` (existant dans l'app).
5. **Typographie** : Satoshi (déjà chargée) pour toute l'UI. Titres d'impact : `font-bold tracking-tight`, héros jusqu'à `text-6xl` ; eyebrows `text-xs font-bold uppercase tracking-widest`. Les moments « manifeste » peuvent monter en weight 800.
6. **Footer institutionnel NOIR** : min-h 180px, fond `--poste-noir`, logo inversé à gauche, **« BACK TO TOP »** à droite au survol jaune (footer.scss). Notre touche : bandeau institutionnel Poste CI + liseré tricolore en pied.
7. **Sections aérées** : `py-20`, contenu `max-w-6xl px-6`, cartes `rounded-3xl border-border/80 bg-card` avec hover `-translate-y-1 shadow-lg border-primary/40`. Numéros de sections en `text-5xl font-bold text-muted-foreground/15` en coin de carte.
8. **Deux plans stricts** : fond vivant (AmbientBackground blobs, hero photo carousel — existants) / cartes **opaques** par-dessus. Jamais de contenu directement sur le fond animé sans carte. Liseré tricolore `.lisere-tricolore` (vert 40% / jaune 30% / noir 30%) comme signature en pied de sections clés.

## 2. Tokens (état actuel Main.css — PAS de changement de palette)

- `--primary` = brand-green (vert logo) — couleur d'action
- `--warning` = **#FFD100 exact** (jaune Poste) — accent, survols, surlignages
- Fond chaud `hsl(45 28% 97%)`, cartes blanches, `--radius: 0.75rem`, cartes composées en `rounded-2xl`/`rounded-3xl`
- Couleurs fonctionnelles : success/destructive/info — jamais confondues avec la marque

**Interdits** : blur/translucide sur les CARTES de contenu (le header `bg-card/90 backdrop-blur` existant est remplacé par blanc opaque) ; emoji dans l'UI ; couleurs hors tokens.

## 3. Composants à utiliser (existants — ne pas réinventer)

| Besoin | Composant |
|---|---|
| Boutons | `components/ds/Button.tsx` (variants intent) + classes `.btn-mint*` pour les CTA marketing |
| Cartes | `components/ds/Card.tsx` (variant feature, rounded-3xl côté usage) |
| Eyebrow/badges | `components/ds/Badge.tsx` (Eyebrow tone amber) |
| Fond ambiant | `components/AmbientBackground.tsx` |
| Apparitions | `components/ds/Reveal.tsx` + framer-motion (ease `[0.16,1,0.3,1]`) |
| Logo | `components/YebaLogo.tsx` (SVG inline — jamais <img> du svg) |
| Formulaires/dashboards | shadcn `components/ui/*` thémés par Main.css |

**Nouveau** : `components/BandeauInstitutionnel.tsx` (strip « Une plateforme au service de La Poste de Côte d'Ivoire »).

## 4. Checklist PR design (copiée dans chaque spec)

1. ☐ Navbar deux états + liens UPPERCASE hover jaune (écrans publics).
2. ☐ Cartes opaques sur fond vivant ; zéro backdrop-blur sur carte de contenu.
3. ☐ Boutons CTA en `.btn-mint*` (inversion au survol) — un seul CTA plein fort par écran.
4. ☐ Hover cartes : `-translate-y-1` + ombre + bordure accent.
5. ☐ Footer noir BACK TO TOP + bandeau institutionnel + liseré tricolore (landing).
6. ☐ Satoshi ; eyebrows uppercase tracking-widest ; zéro emoji (lucide).
7. ☐ Vérifié 375px ET 1280px ; `tsc --noEmit` sans erreur nouvelle.
8. ☐ reduced-motion respecté (blobs, carousel, reveals).
