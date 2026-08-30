# YEBA — Charte graphique La Poste de Côte d'Ivoire
## Doc 04 — Identité visuelle ingénierée : palettes, contrastes mesurés, logo, co-branding

> **Prérequis de lecture** : Doc 03 (design system — les tokens CSS consomment cette charte).
> **Sources** : identité visuelle officielle La Poste de Côte d'Ivoire (mars 2017) ; logo produit `logo.svg` fourni par Ivo (racine du dépôt) ; cahier des charges fonctionnel Yeba (§42 expérience utilisateur).
> **Portée** : ce document est la source unique de vérité couleur + logo + typographie. Le Doc 03 transforme ces règles en tokens et composants ; AUCUN code ne choisit une couleur hors de ce document.

---

## 1. ADN & marques en présence

Deux identités coexistent et ne se confondent JAMAIS :

| Marque | Rôle | Où elle apparaît |
|---|---|---|
| **Yeba** | LE PRODUIT (plateforme de pilotage de la satisfaction) | Logo produit, interface, formulaires, navigation |
| **La Poste de Côte d'Ivoire** | LE CLIENT INSTITUTIONNEL (première entreprise déployée) | Bandeau institutionnel, footer, supports institutionnels |

L'ADN Poste CI repose sur trois symboles historiques : **l'enveloppe** (métier postal), **la tête d'éléphant** (référence ivoirienne), **le quadrilatère** (structure). L'application Yeba n'imite ni ne redessine ces symboles — elle emprunte uniquement la palette institutionnelle et la rigueur.

**Règle fondamentale** : Yeba est la marque interactive (boutons, formulaires, dashboards). La Poste CI est la marque d'ancrage institutionnel (bandeau « Une plateforme au service de La Poste de Côte d'Ivoire », footer). La signature officielle Poste **« Ensemble, construisons la confiance. »** reste distincte du nom de marque et n'apparaît que sur supports institutionnels validés par le client — jamais à l'intérieur des écrans fonctionnels.

---

## 2. Palettes officielles (tokens mesurés WCAG)

### 2.1 Couleurs institutionnelles

| Token CSS | Hex | Usage autorisé | Contraste mesuré |
|---|---|---|---|
| `--poste-vert` | `#00843D` | Primaire : boutons pleins, en-têtes, liens, texte sur blanc, fonds de section | 4.81:1 sur blanc → **AA texte normal** ✓ |
| `--poste-vert-clair` | `#00B050` | UNIQUEMENT dégradés graphiques du logo et halos décoratifs — jamais en texte | 2.87:1 sur blanc → **INTERDIT en texte** |
| `--poste-jaune` | `#FFD100` | Accent : badges, surlignages, fonds de chips, CTA secondaires, liserés | 12.10:1 avec texte noir ✓ — **jamais en texte sur blanc (1.56:1 → échec)** |
| `--poste-noir` | `#111111` | Texte principal, icônes | 18.88:1 sur blanc ✓ |
| `--poste-blanc` | `#FFFFFF` | Fonds de panneaux (TOUJOURS opaques) | — |

### 2.2 Neutres

| Token | Hex | Usage |
|---|---|---|
| `--poste-gris-50` | `#F8F9FA` | Fonds de section alternée |
| `--poste-gris-100` | `#F1F3F5` | Fonds d'inputs, surfaces secondaires |
| `--poste-gris-200` | `#E9ECEF` | Bordures, séparateurs |
| `--poste-gris-500` | `#6C757D` | Texte secondaire (5.41:1 ✓ AA — mesuré avec le gris logo #6A6A6A, quasi identique) |
| `--poste-gris-700` | `#343A40` | Texte appuyé, libellés de formulaires |
| `--poste-gris-900` | `#111111` | = noir |

### 2.3 Couleurs fonctionnelles (JAMAIS confondues avec la marque)

| Token | Hex | Usage |
|---|---|---|
| `--poste-succes` | `#198754` | Confirmations, avis positifs, actions terminées |
| `--poste-alerte` | `#F59E0B` | Alertes, retards, avertissements |
| `--poste-erreur` | `#DC3545` | Erreurs de validation, échecs |
| `--poste-info` | `#0D6EFD` | Informations neutres, aide |

### 2.4 LE CONFLIT TRANCHÉ — orange du logo vs jaune de la charte

Le `logo.svg` fourni contient de l'**orange** (`#FFA000 → #F57C00`) : le check intégré au Y et le mot « ba ». La charte officielle Poste CI prescrit du **jaune** `#FFD100`. Le template Mint utilise un jaune différent (`#FFE600`).

**Décision (consignée au 00-INDEX, 2026-08-29)** :
1. **Le logo n'est JAMAIS modifié** — ses couleurs lui appartiennent (protection de logo, règle officielle Poste).
2. **L'accent UI = `#FFD100`** (jaune charte officielle) — remplace le `#FFE600` du template.
3. **L'orange logo (`#F57C00`/`#FFA000`) est réservé au logo et aux données fonctionnelles `alerte`** — il n'existe nulle part ailleurs dans l'interface.
4. Un fichier `docs/assets/logo-variants/` documentera les déclinaisons officielles à produire (voir §5.3).

---

## 3. Règles d'usage couleur (les interdits sont CONTRACTUELS)

1. **Panneaux opaques, jamais translucides.** `backdrop-blur` et `bg-white/55` sont INTERDITS au-dessus d'un fond animé. Le fond vit AROUND, le panneau opaque (blanc `#FFFFFF` ou gris-50) vit ON TOP. Toute translucidité = « fait IA » = refus.
2. **Le vert `#00843D` est la couleur d'action primaire** : un seul bouton primaire vert par écran visible.
3. **Le jaune `#FFD100` est un accent, pas un fond général** : il attire l'œil sur UNE information par zone (badge « Nouveau », chip sélectionnée, liseré de section). Jamais plus de ~10% de la surface d'un écran.
4. **Orange et vert clair : jamais en texte** (ratios 2.70:1 et 2.87:1 — échec WCAG). Usage graphique/décoratif uniquement.
5. **Couleurs fonctionnelles ≠ marque** : une alerte est `--poste-alerte`, pas du jaune marque ; un succès est `--poste-succes`, pas du vert marque (trop proche pour être ambigu).
6. **Zéro emoji dans l'UI** — icônes lucide-react uniquement (stroke 2, 20px ou 24px).
7. **Couleurs saturées assumées.** Pas de vert délavé, pas de pastel, pas de dégradé pâle. Un dégradé ne s'emploie que vert `#00843D → #00B050` (comme le logo) sur des surfaces pleines.

---

## 4. Typographie

**Décision** : Poppins (famille du logo — cohérence verrouillée). La police Montserrat du template Mint est remplacée. Poids chargés : 400, 500, 600, 700, 800.

| Niveau | Police / poids | Taille | Usage |
|---|---|---|---|
| H1 | Poppins 800 | 3.5rem (56px) desktop / 2.25rem mobile | Titres de héros uniquement |
| H2 | Poppins 700 | 2.25rem / 1.75rem mobile | Titres de section |
| H3 | Poppins 600 | 1.5rem | Titres de panneaux |
| Body | Poppins 400 | 1rem / 1.6 | Texte courant |
| Small | Poppins 400 | 0.875rem | Aides, métadonnées |
| Overline | Poppins 600, letter-spacing 0.12em, UPPERCASE | 0.75rem | Numéros de section (01, 02…), tags |

Le wordmark du logo utilise Poppins 700 (92px dans le SVG source) — reproduit tel quel dans le composant `LogoInline`.

---

## 5. Le logo Yeba

### 5.1 Anatomie (source : `logo.svg`, 960×260)

- **Icône** : bulle de conversation (dégradé vert `#00B050 → #00843D`) contenant un **Y blanc** fusionné avec un **check orange** — symbole « avis validé ».
- **Wordmark** : « Yé » vert `#00A651` + « ba » orange `#F57C00`, Poppins 700.
- **Baseline produit** : « VOTRE AVIS • NOTRE PRIORITÉ », Poppins 500, gris `#6A6A6A`, letter-spacing 3px.

### 5.2 Piège d'ingénierie SVG (CONTRAT TECHNIQUE)

Le fichier `logo.svg` charge Poppins via `@import` Google Fonts dans un `<style>`. **Les polices ne se chargent PAS dans un contexte `<img src="logo.svg">`** → rendu de secours Arial = logo dégradé sans que personne ne le voie.

**Règle** : le logo s'affiche UNIQUEMENT via le composant React `src/components/brand/LogoInline.jsx` (SVG inline + Poppins déjà chargée par l'app). Le fichier `logo.svg` reste l'artefact source (export, impression) mais ne passe JAMAIS par un `<img>` dans l'application.

### 5.3 Variantes à produire (dossier `src/assets/brand/`)

| Variante | Fichier | Usage |
|---|---|---|
| Lockup complet (fond clair) | `logo-lockup.svg` | Navbar, footer, écrans publics |
| Icône seule | `logo-icon.svg` | Favicon, avatar, mobile (min 32px) |
| Inversé blanc sur vert | `logo-lockup-invert.svg` | Pieds de page verts, en-têtes de session connectée |
| Monochrome noir | `logo-lockup-mono.svg` | Documents, fax, impressions N&B |

### 5.4 Protection du logo

- **Zone de protection** : autour du lockup, espace libre = 50% de la hauteur de l'icône (48px sur le lockup source 260px).
- **Tailles minimales** : lockup 160px de large ; icône seule 32×32px.
- **Interdits** : déformer, recolorer, ajouter d'ombre/porter le logo sur photo sans voile plein, réinverser les couleurs du wordmark (le Yé reste vert, le ba reste orange), placer le logo sur fond jaune (collision accent).

### 5.5 Co-branding institutionnel Poste CI

- **Bandeau institutionnel** : strip fin (h-10) sous la navbar des écrans publics — fond `--poste-gris-50`, texte gris-700 : « Une plateforme au service de La Poste de Côte d'Ivoire ». C'est l'ANCRE institutionnelle standard (pattern SectionShell, Doc 03 §6).
- **Logo officiel Poste** : ne JAMAIS le redessiner ni l'imiter. Si le client le fournit, le déposer tel quel dans `src/assets/brand/poste-ci-logo.(svg|png)` et l'afficher uniquement dans le footer et le bandeau institutionnel, hauteur max 32px, avec sa zone de protection officielle.
- **Signature « Ensemble, construisons la confiance. »** : réservée aux supports institutionnels validés par le client (rapports PDF imprimés). Hors interface applicative.

---

## 6. Textures & motifs (remplaçants des interdits blob/néon)

Les fonds dégradés radiaux type « blob néon » sont INTERDITS (esthétique IA rejetée). Les surfaces vivantes s'obtiennent par :

1. **Grain papier** : overlay SVG `feTurbulence` à 3-4% d'opacité sur les fonds de section.
2. **Trame géométrique fine** : grille de lignes verticales 1px `--poste-gris-200` espacées de 64px sur les fonds gris-50.
3. **Liseré tricolore** : barre 4px en pied de section institutional (vert → jaune → noir), signature visuelle Yeba × Poste CI.
4. **Halos décoratifs** : formes géométriques pleines (cercles/quadrilatères aux couleurs marque, opacité 8-12%) MOUVANTES autour des panneaux — jamais sous le texte.

---

## 7. Rayons, ombres, élévation

| Élément | Rayon | Ombre |
|---|---|---|
| Panel (conteneur majeur opaque) | 16px | `0 8px 30px rgba(0,68,32,0.10)` |
| Card (bloc de contenu dans un panel) | 12px | `0 2px 10px rgba(17,17,17,0.06)` |
| Chip / badge | 8px (pill autorisé pour les statuts) | aucune |
| Bouton | 10px | hover : `0 4px 14px rgba(0,132,61,0.25)` |

Hiérarchie OBLIGATOIRE : rayon panel > card > chip > bouton. Jamais l'inverse.

---

## 8. Checklist conformité charte (à passer avant CHAQUE PR)

1. Aucune couleur hors tokens §2 (grep des hex bruts interdits dans les composants).
2. Aucun texte sur orange/vert clair/jaune-sur-blanc.
3. Tous les panneaux opaques (zéro `backdrop-blur`, zéro `/opacity` sur les fonds de panneaux).
4. Logo rendu via `LogoInline` (jamais `<img src="*.svg">`).
5. Bandeau institutionnel Poste CI présent sur tout écran public.
6. Zéro emoji, icônes lucide cohérentes (une seule famille de stroke).
7. Rayons hiérarchisés panel > card > chip.
8. Contrastes vérifiés sur le duo exact fond/couleur utilisés (table §2 comme référence).
