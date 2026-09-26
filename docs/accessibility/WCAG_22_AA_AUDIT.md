# Audit d'accessibilité — WCAG 2.2 niveau AA

**Branche** : `hermes/v4-a11y` · **Périmètre** : Vague 4 du chantier Hermes
**Date** : 2026-09-26 · **Méthode** : revue de code + mesures de contraste calculées (formule WCAG) + tests jsdom

Ce document est la source de vérité de la Vague 4. Il distingue trois
statuts : **Corrigé** (le code a été modifié et un test le verrouille),
**Partiel** (corrigé sur le parcours public, reste à faire ailleurs),
**Restant** (connu, non traité, listé avec le chemin exact).

---

## 1. Décision structurante : la charte reste intacte

`docs/frontend/04-charte-graphique-poste-ci.md` fige le vert de marque
(`149 100% 33%`, #00A851). Ce vert **en texte** sur fond clair plafonne à
**3,11:1** : il échoue l'exigence 1.4.3 (4,5:1 pour du texte normal).

Deux règles d'emploi ont donc été adoptées, sans toucher à la teinte :

| Usage | Jeton | Exemple |
|---|---|---|
| Aplat (fond de bouton, badge, barre de graphique) | `color_primary`, `color_success`… | `bg-primary text-primary-foreground` |
| Texte, icône, bordure sur fond clair ou teinté | `color_*_strong` | `text-primary-strong` |

Quatre jetons ont été ajoutés dans `src/shared/branding.ts` :
`color_primary_strong` (152 100% 22%), `color_success_strong` (147 85% 26%),
`color_warning_strong` (39 100% 27%), `color_destructive_strong` (0 69% 41%).

Ratios mesurés (luminance relative WCAG) :

| Jeton | Sur crème `#FAF7F2` | Sur blanc `#FFFFFF` |
|---|---|---|
| `primary` (avant) | 2,88:1 ✗ | 3,11:1 ✗ |
| `primary-strong` | **5,73:1** ✓ | **6,19:1** ✓ |
| `success` (avant) | 3,29:1 ✗ | 3,55:1 ✗ |
| `success-strong` | **4,99:1** ✓ | **5,39:1** ✓ |
| `warning` (avant) | 1,53:1 ✗ | 1,65:1 ✗ |
| `warning-strong` | **5,52:1** ✓ | **5,96:1** ✓ |
| `destructive` (avant) | 4,44:1 ✗ | 4,80:1 ✓ |
| `destructive-strong` | **6,28:1** ✓ | **6,79:1** ✓ |

Ces valeurs sont verrouillées par `src/shared/branding.test.ts` (4 tests) :
un retour en arrière de teinte fait échouer la suite.

### Écart assumé

Le **blanc sur aplat vert de marque** reste à **3,11:1**. Ce cas n'est pas
corrigé : il est **documenté ici** et verrouillé par un test qui échouerait
si quelqu'un modifait le jeton sans le signaler. Deux voies possibles, à
décider au niveau produit (voir §5).

---

## 2. Conformité par critère

Légende : ✅ Corrigé · 🟡 Partiel · ⛔ Restant

### 1.1.1 Contenus non textuels — 🟡
- ✅ Les 5 graphiques de `src/client/components/DashboardCharts.tsx` sont
  exposés en `role="img"` avec un résumé chiffré, et accompagnés d'un vrai
  tableau HTML `.sr-only` portant les mêmes données (composant
  `TableauAccessible`).
- ⛔ `HeatmapReponses.tsx` : la carte de chaleur n'a pas encore d'alternative
  textuelle. Elle est tabulaire par nature : même traitement à apply
  (tableau `sr-only`).

### 1.3.1 Info et relations — ✅
- ✅ Les deux `<label>` décoratifs de l'étape commentaire étaient en fait
  des `<span>` : le nom accessible retombait sur le `placeholder`, qui
  disparaît dès la saisie. Ils sont maintenant associés par `htmlFor`/`id`
  (`avis-commentaire`, `avis-telephone`).

### 1.4.3 Contraste (minimum) — 🟡
- ✅ 64 occurrences de `text-primary|success|warning|destructive` sur fond
  clair ou teinté converties en `-strong` dans : `CollectePage`,
  `DashboardPage`, `AvisPage`, `StatCard`, `DashboardSummary`,
  `AIAnalysisBadge`, `ds/Badge`, `ObjectifsProgress`.
- ✅ `text-muted-foreground` vérifié à 5,22:1 sur crème (conforme).
- 🟡 Écart documenté : blanc sur `bg-primary` (3,11:1) — voir §1.

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

### 3.3.1 / 3.3.2 Étiquette et instructions — 🟡
- ✅ Champs commentaire et téléphone : nom accessible + `aria-describedby`
  pointant vers une aide réellement associée (le `<p>` d'explication du
  hachage n'était qu'un simple nœud voisin sans association).
- ⛔ 26 `<SelectTrigger>` sur ~30 n'ont ni `aria-label` ni `<label>`
  associé : `ConfigurationCriteresPage` (9), `AvisPage` (5),
  `PlanningPage` (4), `AdminPersonnelPage` (3), `QuestionsParOperation` (3),
  `GuichetsPage` (2), `AlertesTachesPage`, `DashboardPage`,
  `SyntheseGlobalePage`, `EditeurOptions`. Inventaire exact à traiter en
  Vague 4b.

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
| `src/shared/branding.test.ts` | 4 | ratios ≥ 4,5:1 des variantes, anneau ≥ 3:1, écart du blanc sur aplat documenté |
| `src/client/pages/CollectePage.test.tsx` | +5 | radiogroup nommés, flèches, région live pré-montée, labels associés, cible 44 px |

Total après Vague 4 : **244 tests** répartis sur 21 fichiers, dont 18 sur le parcours
de collecte (13 de flux + 5 d'accessibilité).

Ces tests protègent contre la régression silencieuse type : le parcours
refonctionnerait (les 13 tests de flux passeraient) tout en redevenant
inaccessible. C'est précisément ce que la Vague 4 cherche à empêcher.

---

## 4. Restant connu (Vague 4b)

| # | Constat | Chemin | Critère |
|---|---|---|---|
| A1 | 26 `<SelectTrigger>` sans nom accessible | voir §3.3.1 | 4.1.2 |
| A2 | Carte de chaleur sans alternative | `components/HeatmapReponses.tsx` | 1.1.1 |
| A3 | Lignes de tableau cliquables sans `role`/`tabIndex` | `components/ui/DataTable.tsx` | 2.1.1 |
| A4 | Tests automatisés uniquement en jsdom, pas de test navigateur | `vitest.config.ts` | — |
| A5 | White label : le nom de la plateforme dépend du tenant, à revérifier par client's couleurs | `context/BrandContext.tsx` | 1.4.3 |

## 5. Décisions produit attendues

1. **Blanc sur vert de marque (3,11:1)** : trois options —
   (a) conserver l'aplat et passer les libellés de boutons en `primary-strong`
   (le fond reste la marque, le texte devient conforme) ;
   (b) garde-fou : réserver `bg-primary` aux aplats sans texte et documenter
   l'usage ;
   (c) assouplir la charte Doc 04 pour un vert foncé — **nécessite un arbitrage
   explicite**, le Doc 04 étant contractuel.
2. **Choix de l'outil de test a11y** (axe-core / Playwright) pour A4.

---

## 6. Vérifications

```bash
npx tsc --noEmit -p tsconfig.src.json     # 0 erreur
npm test                                  # 244 tests / 21 fichiers
set -a; source .env.server; set +a; timeout 600 wasp build
```
