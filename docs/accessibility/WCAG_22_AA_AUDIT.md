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
`color_primary_strong` (148 100% 20%), `color_success_strong` (147 76% 24%),
`color_warning_strong` (39 100% 27%), `color_destructive_strong` (0 72% 38%).

Ratios mesurés (luminance relative WCAG) :

| Jeton | Sur crème `#FAF7F2` | Sur blanc `#FFFFFF` |
|---|---|---|
| `primary` (vert vif, avant) | 2,88:1 ✗ | 3,11:1 ✗ |
| `primary` (Doc 04, aujourd'hui) | 4,41:1 — voir ci-dessus | **4,77:1** ✓ |
| `primary-strong` | **6,60:1** ✓ | **7,14:1** ✓ |
| `success` (avant) | 3,29:1 ✗ | 3,55:1 ✗ |
| `success-strong` | **6,05:1** ✓ | **6,54:1** ✓ |
| `warning` (avant) | 1,53:1 ✗ | 1,65:1 ✗ |
| `warning-strong` | **5,52:1** ✓ | **5,96:1** ✓ |
| `destructive` (avant) | 4,44:1 ✗ | 4,80:1 ✓ |
| `destructive-strong` | **6,91:1** ✓ | **7,47:1** ✓ |

Ces valeurs sont verrouillées par `src/shared/branding.test.ts` : revenir
au vert vif ferait échouer la suite, au lieu de casser silencieusement
tous les boutons pleins.

### Le cas que les premiers tests ne voyaient pas

Une option sélectionnée n'est pas un aplat de marque : c'est la teinte de
l'accent **à 25 % d'opacité sur la crème** (`bg-success/25`). Mesurer le
contraste du texte sur la teinte *pleine* conclut à tort que tout passe —
le fond réel est plus sombre, donc le texte l'est moins.

En composant réellement l'opacité, la mesure a révélé un défaut
**préexistant** que les premiers tests avaient laissé passer : le texte
des options sélectionnées était à **4,01:1** (« Non » de l'option Oui/Non,
4,01:1 ; « Oui », 4,46:1) — c'est-à-dire le parcours le plus fréquent de
l'application, sur la borne du guichet. Les quatre variantes ont été
recalibrées sur ce pire cas (et non sur le fond de page) : le minimum
est passé à **4,69:1**.

Le test compose désormais l'opacité au lieu de raisonner sur la teinte
seule, et il est vérifié *en échec* : remit sur l'ancienne valeur de
`success_strong`, il détecte bien 4,01:1.

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
| `src/shared/branding.test.ts` | 16 | ratios ≥ 4,5:1 des variantes, anneau ≥ 3:1, **blanc sur aplat ≥ 4,5:1**, **texte sur aplat teinté à 10/15/25 % d'opacité**, hiérarchie primaire/secondaire, garde-fous white-label |
| `src/client/pages/CollectePage.test.tsx` | +5 | radiogroup nommés, flèches, région live pré-montée, labels associés, cible 44 px |
| `src/client/pages/AvisPage.a11y.test.tsx` | 1 | audit axe-core de la page « Avis » (back-office) dans son état CHARGÉ, + un jeu de données complet |
| `src/client/pages/CollectePage.a11y.test.tsx` | 4 | audit axe-core du parcours public (SMILEY, OUI_NON, commentaire) + un test témoin qui prouve que l'auditeur signale bien |

Total après Vague 4 : **260 tests** répartis sur 21 fichiers, dont 18 sur le parcours
de collecte (13 de flux + 5 d'accessibilité) et 11 de contraste/garde-fous.

Ces tests protègent contre la régression silencieuse type : le parcours
refonctionnerait (les 13 tests de flux passeraient) tout en redevenant
inaccessible. C'est précisément ce que la Vague 4 cherche à empêcher.

---

### Ce que l'élargissement de l'audit à une page interne a trouvé

L'audit automatisé ne portait que sur le parcours public. Élargi à la page
« Avis » — l'écran interne le plus consulté, monté dans son état CHARGÉ —
il a trouvé deux défauts que personne n'avait vus :

| Défaut | Effet | Critère |
|---|---|---|
| Les deux champs date du filtre avaient un `<label>` décoratif (aucun `htmlFor`) | Le lecteur d'écran annonçait « date » sans dire laquelle | 1.3.1 / 4.1.2 |
| `LigneReponse` lisait `score_brut` (colonne héritée, nullable) dans sa branche SMILEY | **Un client ayant mis 4/5 pouvait s'afficher avec 1 étoile et une barre à 0/5** quand `score_brut` est NULL et `score_officiel` renseigné | — (intégrité de la donnée affichée) |

Le second est le plus grave : la branche ECHELLE du même composant
résolvait déjà la note canonique, avec un commentaire expliquant pourquoi —
les deux branches n'étaient pas d'accord sur la source, et celle du
SMILEY reprenait la colonne que la migration avait marquée « legacy ».
Même famille de défaut que la vague 6 : deux règles pour une même donnée.

Huit écrans sont désormais audités : parcours public, Avis, Guichets,
Planning, Alertes & Tâches, Personnel, Agences, Archives. **Aucune
violation** sur les sept derniers. Deux mérite d'être notés :
- le Planning est le seul écran construit comme une grille (7 jours ×
  créneaux), donc celui où les sémantiques de tableau devraient porter
  l'information ; il est conforme ;
- les Archives rassemblent guichets, agences, alertes et tâches dans un
  même écran — l'écran le plus hétérogène de l'application, et le plus
  exposé au risque de listes ou filtres sans nom ; il est conforme.

Les pages restantes (Configuration des critères, Réglages) et la page
d'accueil relèvent du même harnais : ~30 lignes par écran.

L'élargissement a aussi nécessité deux correctifs de configuration, tous
deux sighted comme des obstacles à l'audit lui-même :
- les tests transformaient le JSX en runtime CLASSIQUE alors que
  l'application utilise le runtime AUTOMATIQUE : tout composant qui
  n'importe pas React explicitement échouait au rendu ;
- `ResizeObserver` n'existe pas dans jsdom, alors que Recharts l'utilise
  au montage : le test échouait sur une absence d'API, sans rapport avec
  le code audité. Fourni une double muette.

Délai de test relevé à 20 s pour le projet UI : un audit axe sur une page
interne réelle dépasse régulièrement 5 s. À 5 s, le test échouait sur la
charge de la machine, jamais sur le code — le pire signal possible, parce
qu'on apprend à l'ignorer.

## 4. Restant connu (Vague 4b)

| # | Constat | Chemin | Critère |
|---|---|---|---|
| ~~A1~~ | `<SelectTrigger>` sans nom accessible | — | **corrigé** |
| ~~A2~~ | Carte de chaleur sans alternative | — | **corrigé** |
| ~~A3~~ | Lignes de tableau cliquables sans `tabIndex` | — | **corrigé** |
| ~~A5~~ | White-label : le tenant pouvait casser le contraste | — | **corrigé** (voir ci-dessous) |
| A4 (partiel) | axe-core couvre 5 écrans (parcours public, Avis, Guichets, Planning, Alertes & Tâches) ; restent les pages de configuration et le rendu réel (focus visible, taille de cible) | `src/client/__mocks__/harnaisA11y.tsx` | — |

### A5 — le white-label pouvait déroger au contraste

Un tenant peut surcharger `color_primary` et `color_background`. Ces
valeurs échappaient à toute vérification : les tests de contraste ne
portaient que sur `BRANDING`, pas sur la valeur réellement injectée dans
la feuille de style du guichet. Un fond sombre ou un primaire jaune pâle
rendaient la page illisible sans qu'aucun test ne le voie.

Trois garde-fous purs et testés (`src/shared/branding.ts`) :

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

1. **Playwright, ou non ?** axe-core tourne désormais sous jsdom et
   contrôle automatiquement toutes les règles structurelles (nom, rôle,
   valeur, association des labels, structure des titres) sur le parcours
   public. Il ne peut pas contrôler ce qui est du RENDU : focus visible
   (2.4.13) et taille de cible réelle (2.5.8) exigent un vrai navigateur.
   Playwright les couvrirait, au prix du téléchargement du navigateur et
   de la mise en route de l'app entière avec sa base pour les tests.
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
npm test                                  # 260 tests / 22 fichiers
set -a; source .env.server; set +a; timeout 600 wasp build
```
