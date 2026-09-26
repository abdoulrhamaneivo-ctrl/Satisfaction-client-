# Audit d'accessibilité — WCAG 2.2 niveau AA

**Branche** : `hermes/v4-a11y` · **Périmètre** : Vague 4 du chantier Hermes
**Date** : 2026-09-26 · **Méthode** : revue de code + mesures de contraste calculées (formule WCAG) + tests jsdom

Ce document est la source de vérité de la Vague 4. Il distingue trois
statuts : **Corrigé** (le code a été modifié et un test le verrouille),
**Partiel** (corrigé sur le parcours public, reste à faire ailleurs),
**Restant** (connu, non traité, listé avec le chemin exact).

---

## 1. Décision structurante : aligner le primaire sur la charte

Une première version de ce document affirmait que la charte
(`docs/frontend/04-charte-graphique-poste-ci.md`) figeait le vert
`#00A851` et interdisait donc de le modifier. **C'était faux**, et l'erreur
a été reprise dans le code, les commentaires et l'audit V0.

Ce que dit réellement le Doc 04 — qui se déclare « source unique de vérité
couleur » et interdit « AUCUN code qui choisirait une couleur hors de ce
document » :

| Token Doc 04 | Hex | Usage autorisé | Contraste mesuré |
|---|---|---|---|
| `--poste-vert` | `#00843D` | **Boutons pleins**, en-têtes, liens, texte sur blanc | 4,81:1 sur blanc ✓ |
| `--poste-vert-clair` | `#00B050` | **UNIQUEMENT** dégradés et halos décoratifs — *jamais en texte* | 2,87:1 ✗ |

`#00A851` n'est ni l'un ni l'autre : c'était une troisième vert, hors
charte. `color_primary` a donc été aligné sur `#00843D`, et le vert vif
conservé dans `Main.css` (`--brand-green`) pour les seuls halos
décoratifs — exactement l'usage que le Doc 04 accorde au vert clair.

**L'écart 1.4.3 sur les aplats est donc levé, pas documenté** : le blanc
sur le bouton primaire passe de 3,11:1 à **4,77:1**, sans toucher aux
76 `<Button>` ni aux badges pleins. `color_secondary` a été assombri d'un
cran (`152 100% 20%`, 7,11:1 sous texte blanc) pour rester distinct du
primaire — sans quoi les deux jetons de hiérarchie se confondraient.

### Règle d'emploi qui subsiste

Le même vert, **en texte** sur fond clair, plafonne à **4,41:1** sur la
crème : sous le seuil. D'où les variantes réservées au texte :

| Usage | Jeton | Exemple |
|---|---|---|
| Aplat (fond de bouton, badge, barre de graphique) | `color_primary`, `color_secondary`… | `bg-primary text-primary-foreground` |
| Texte, icône, bordure sur fond clair ou teinté | `color_*_strong` | `text-primary-strong` |

Quatre jetons ont été ajoutés dans `src/shared/branding.ts` :
`color_primary_strong` (152 100% 22%), `color_success_strong` (147 85% 26%),
`color_warning_strong` (39 100% 27%), `color_destructive_strong` (0 69% 41%).

Ratios mesurés (luminance relative WCAG) :

| Jeton | Sur crème `#FAF7F2` | Sur blanc `#FFFFFF` |
|---|---|---|
| `primary` (vert vif, avant) | 2,88:1 ✗ | 3,11:1 ✗ |
| `primary` (Doc 04, aujourd'hui) | 4,41:1 — voir ci-dessus | **4,77:1** ✓ |
| `primary-strong` | **5,73:1** ✓ | **6,19:1** ✓ |
| `success` (avant) | 3,29:1 ✗ | 3,55:1 ✗ |
| `success-strong` | **4,99:1** ✓ | **5,39:1** ✓ |
| `warning` (avant) | 1,53:1 ✗ | 1,65:1 ✗ |
| `warning-strong` | **5,52:1** ✓ | **5,96:1** ✓ |
| `destructive` (avant) | 4,44:1 ✗ | 4,80:1 ✓ |
| `destructive-strong` | **6,28:1** ✓ | **6,79:1** ✓ |

Ces valeurs sont verrouillées par `src/shared/branding.test.ts` : revenir
au vert vif ferait échouer la suite, au lieu de casser silencieusement
tous les boutons pleins.

---

## 2. Conformité par critère

Légende : ✅ Corrigé · 🟡 Partiel · ⛔ Restant

### 1.1.1 Contenus non textuels — ✅
- ✅ Les 5 graphiques de `src/client/components/DashboardCharts.tsx` sont
  exposés en `role="img"` avec un résumé chiffré, et accompagnés d'un vrai
  tableau HTML `.sr-only` portant les mêmes données (composant
  `TableauAccessible`).
- ✅ `HeatmapReponses.tsx` : la carte de chaleur est désormais un
  tableau `sr-only` (jour × heure, score moyen ET volume). La grille
  visuelle est `aria-hidden` et ses 168 cellules retirées du parcours de
  tabulation : l'infobulle de score n'existait qu'au survol souris, et
  le `aria-label` d'avant n'annonçait que le volume — la satisfaction
  n'était inaccessible à un lecteur d'écran.

### 1.3.1 Info et relations — ✅
- ✅ Les deux `<label>` décoratifs de l'étape commentaire étaient en fait
  des `<span>` : le nom accessible retombait sur le `placeholder`, qui
  disparaît dès la saisie. Ils sont maintenant associés par `htmlFor`/`id`
  (`avis-commentaire`, `avis-telephone`).

### 1.4.3 Contraste (minimum) — ✅
- ✅ 64 occurrences de `text-primary|success|warning|destructive` sur fond
  clair ou teinté converties en `-strong` dans : `CollectePage`,
  `DashboardPage`, `AvisPage`, `StatCard`, `DashboardSummary`,
  `AIAnalysisBadge`, `ds/Badge`, `ObjectifsProgress`.
- ✅ `text-muted-foreground` vérifié à 5,22:1 sur crème (conforme).
- ✅ **Blanc sur aplat de marque : 3,11:1 → 4,77:1**, en alignant
  `color_primary` sur le vert que le Doc 04 désigne pour les boutons pleins
  (voir §1). Écart levé, pas documenté.
- ✅ Le white-label ne peut plus déroger : fond non conforme ignoré,
  variante texte et anneau dérivés, libellé d'aplat basculé au noir si le
  blanc ne passe pas (voir §4, A5).

### 1.4.11 Anneau de focus non masqué — ✅
- ✅ `color_ring` passe de `149 100% 33%` à `152 100% 22%` (1,58:1 → 5,73:1).
- ✅ Les 30+ occurrences de `ring-ring/40`, `ring-ring/30` et
  `focus:ring-ring/40` ont été ramenées à `ring-ring` pleine opacité, dans
  tout `src/client` (dont `ui/button.tsx`, `Sidebar`, `MobileAppHeader`,
  `PageShell`, pages plateforme).

### 2.1.1 Clavier — ✅
- ✅ Les groupes à choix unique (SMILEY, OUI_NON, QCM, ECHELLE, NPS) sont
  des `role="radiogroup"` nommés, dont les options sont des `role="radio"`
  avec `aria-checked`. Les flèches ← → ↑ ↓ sélectionnent l'option
  voisine (helper `deplacerChoix` dans `CollectePage.tsx`).
  Sans cela, un NPS 0-10 exigeait 11 tabulations.
- ✅ CASES (sélection multiple) : le groupe porte un nom accessible
  (`role="group"`) et chaque option reste une bascule `aria-pressed`.

### 2.1.2 Aucun piège clavier — ✅
- ✅ Piège de focus ajouté à `CommandPalette` (elle se déclare déjà
  `aria-modal="true"`).
- ✅ Piège de focus + fermeture par `Échap` + retour du focus au déclencheur
  ajoutés à `OnboardingTour`, qui n'était qu'un `div` positioned.

### 2.4.1 Contourner des blocs — ✅
- ✅ Lien d'évitement « Aller au contenu principal » ajouté dans
  `src/client/App.tsx`, ciblant le `<main id="contenu-principal">` existant
  dans les deux branches du shell. Invisible (`sr-only`) jusqu'à réception
  du focus.

### 2.4.3 Ordre de focus — ✅
- ✅ Focus initial sur le premier élément du tutoriel et sur le champ de
  recherche de la palette ; focus restauré à la fermeture.

### 2.5.8 Taille de la cible — 🟡
- ✅ « Réessayer » (T2) et « Réessayer l'envoi » (T1) passent de ~16 px à
  44 px (`min-h-11`) ; « Passer » également.
- 🟡 La mesure réelle relève d'un navigateur : le test jsdom vérifie la
  classe, pas le rendu.

### 3.3.1 / 3.3.2 Étiquette et instructions — ✅
- ✅ Champs commentaire et téléphone : nom accessible + `aria-describedby`
  pointant vers une aide réellement associée (le `<p>` d'explication du
  hachage n'était qu'un simple nœud voisin sans association).
- ✅ Les 30 `<SelectTrigger>` portent maintenant un nom accessible
  (`aria-label` reproduisant le libellé visible, ou `id` + `<Label htmlFor>`
  quand il existait déjà) : `ConfigurationCriteresPage` (9), `AvisPage` (5),
  `PlanningPage` (4), `AdminPersonnelPage` (2), `QuestionsParOperation` (1),
  `GuichetsPage` (2), `DashboardPage`, `SyntheseGlobalePage`. Aucun
  déclencheur sans nom ne subsiste.

### 4.1.2 Nom, rôle, valeur — ✅
- ✅ Groupes d'options nommés (voir 2.1.1), tutoriel et palette nommés en
  `role="dialog"`, pastilles de progression dotées d'un `sr-only`
  (« Question 3 sur 5 : répondue ») via le composant `IndicateurReponse`.

### 4.1.3 Messages d'état — ✅
- ✅ La zone d'erreur T1 (`role="alert"`) et la région d'accusé
  (`role="status"`) sont **montées en permanence** : insérées au moment du
  message, elles n'étaient pas annoncées de façon fiable. Hors message,
  elles sont vides (`sr-only` pour l'accusé) donc sans impact visuel.
- ✅ `peutReduireMouvement` (via `prefers-reduced-motion`) neutralise les
  animations d'accusé et de pulsation ; la règle CSS globale
  `Main.css:215` couvre le reste.

---

## 3. Tests ajoutés

| Fichier | Tests | Ce qui est verrouillé |
|---|---|---|
| `src/shared/branding.test.ts` | 13 | ratios ≥ 4,5:1 des variantes, anneau ≥ 3:1, **blanc sur aplat ≥ 4,5:1**, hiérarchie primaire/secondaire, garde-fous white-label |
| `src/client/pages/CollectePage.test.tsx` | +5 | radiogroup nommés, flèches, région live pré-montée, labels associés, cible 44 px |

Total après Vague 4 : **253 tests** répartis sur 21 fichiers, dont 18 sur le parcours
de collecte (13 de flux + 5 d'accessibilité) et 11 de contraste/garde-fous.

Ces tests protègent contre la régression silencieuse type : le parcours
refonctionnerait (les 13 tests de flux passeraient) tout en redevenant
inaccessible. C'est précisément ce que la Vague 4 cherche à empêcher.

---

## 4. Restant connu (Vague 4b)

| # | Constat | Chemin | Critère |
|---|---|---|---|
| ~~A1~~ | `<SelectTrigger>` sans nom accessible | — | **corrigé** |
| ~~A2~~ | Carte de chaleur sans alternative | — | **corrigé** |
| ~~A3~~ | Lignes de tableau cliquables sans `tabIndex` | — | **corrigé** |
| ~~A5~~ | White-label : le tenant pouvait casser le contraste | — | **corrigé** (voir ci-dessous) |
| A4 | Tests automatisés uniquement en jsdom, pas de test navigateur | `vitest.config.ts` | — |

### A5 — le white-label pouvait déroger au contraste

Un tenant peut surcharger `color_primary` et `color_background`. Ces
valeurs échappaient à toute vérification : les tests de contraste ne
portaient que sur `BRANDING`, pas sur la valeur réellement injectée dans
la feuille de style du guichet. Un fond sombre ou un primaire jaune pâle
rendaient la page illisible sans qu'aucun test ne le voie.

Trois garde-fous purs et testés (`src/shared/branding.ts`, 8 tests) :

- `fondWhiteLabelRecevable(fond, texteParDefaut)` : un fond qui n'est pas une
  surface claire, ou qui n'atteint pas 4,5:1 avec le texte par défaut, est
  **ignoré** — l'application retombe sur la charte Yéba ;
- `varianteTextePourFond(primaire, fond, ratio)` : la teinte d'aplat du client
  est conservée, mais sa variante « texte » et l'anneau de focus sont
  assombris juste ce qu'il faut pour atteindre 4,5:1 (respectivement 3:1) ;
- `foregroundPourAplat(primaire)` : le **libellé posé sur l'aplat** bascule
  au noir des jetons (18,9:1) quand le blanc ne passe pas. On ne peut pas
  assombrir l'aplat sans détruire l'identité du client : c'est donc l'autre
  terme du couple qui s'adapte. Un aplat sombre — le cas courant — garde le
  blanc, rien ne change.

Un tenant qui ne touche à aucune couleur conserve la charte à
l'identique : la dérivation n'est appliquée que s'il personnalise
réellement une couleur.

## 5. Décisions product restantes

1. **Choix de l'outil de test a11y** (axe-core / Playwright) pour A4 — c'est
   la seule chose qui bloque une certification « AA vérifiée » : tout le
   reste est vérifié par le calcul et par des tests jsdom, mais la cible
   tactile réelle et l'anneau de focus visible ne se mesurent que dans un
   navigateur.
2. **Revue visuelle du vert foncé** : aligner le primaire sur `#00843D`
   assombrit tous les aplats pleins (boutons, badges, cases cochées,
   pastilles de progression, curseur de l'onboarding). C'est conforme et
   conforme au Doc 04, mais c'est un changement d'aspect qui mérite un
   coup d'œil avant déploiement.
3. **Couleur du tenant** : le garde-fou garantit le contraste, pas
   l'esthétique. Un tenant qui saisit une teinte hors de la famille verte
   verra son aplat respecté (c'est son identité) mais un libellé noir.
   Une validation visuelle avant enregistrement serait cohérente.

---

## 6. Vérifications

```bash
npx tsc --noEmit -p tsconfig.src.json     # 0 erreur
npm test                                  # 253 tests / 21 fichiers
set -a; source .env.server; set +a; timeout 600 wasp build
```
