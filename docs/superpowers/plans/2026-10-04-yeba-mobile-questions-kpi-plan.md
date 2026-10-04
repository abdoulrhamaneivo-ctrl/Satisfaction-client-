# Yeba Mobile + Questions + KPI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin 100% utilisable au pouce (web+mobile) sans refonte desktop, 2 gabarits Express-30s / Qualité-45s avec option Autre à saisie libre, KPI significatifs (moyennes par terme, répartitions, NPS, tendances).

**Architecture:** Fix ciblés mobile-first sur shell admin existant (drawer + tab-bar, 44px, accordéons, bottom-sheet). Gabarits via seed `Service` + `createCritere` (pas de table Template). Convention `AUTRE_LIBRE` sans migration. Nouvelles queries agrégation réutilisant `score_normalise` / `agregerNPS` / `scoreMoyenParAvis`, jamais `score_brut`.

**Tech Stack:** Wasp, React, TypeScript, Prisma/PostgreSQL, Tailwind v4, Vitest, axe-core.

## Global Constraints

- Ne jamais moyenner TEXTE/QCM/CASES/NPS/CES avec la satisfaction (`noteSur5.ts`, `estCritereSatisfaction`).
- NPS = `%promoteurs - %détracteurs` via `agregerNPS`, jamais une moyenne.
- `score_normalise` seul pour les moyennes, jamais `score_brut`.
- 1 critère = 1 seul service (`actions.ts:2543`) — dupliquer si partagé, ne pas contourner.
- Autre : 1 max par critère, `est_scorable=false, score=null, poids=0`, jamais `EXCLUSIF`.
- Attente = QCM 3 tranches (<10 / 10-30 / >30), motif = QCM choix unique (décisions Ruling-1/2).
- Seuil affichage `n>=5`, `text-base` anti-zoom iOS conservé, `prefers-reduced-motion` respecté.
- Desktop inchangé visuellement ; mobile = améliorations tactiles seules.
- TDD : test failing d'abord pour chaque logique (scoring, résolution, agrégation).

---

## File and responsibility map

| File | Responsibility |
| --- | --- |
| `src/client/App.tsx`, `MobileAppHeader.tsx`, `Sidebar.tsx`, `PageShell.tsx`, `PageHeader.tsx` | Shell + nav mobile (tab-bar, 44px, gouttières) |
| `src/client/pages/PlanningPage.tsx`, `DashboardPage.tsx`, `AvisPage.tsx`, `GuichetsPage.tsx`, `GestionAgencesPage.tsx`, `AlertesTachesPage.tsx`, `SettingsPage.tsx` | Pages admin tactiles (filtres, tableaux→cartes, dialogs) |
| `src/client/components/ui/dialog.tsx`, `ui/sheet.tsx` | Bottom-sheet mobile + scroll interne |
| `src/server/scripts/dbSeeds.ts`, `src/server/actions.ts`, `src/server/queries.ts` | Seeds gabarits Express/Qualité, création critères/services |
| `src/client/collecte/payload.ts`, `src/client/pages/CollectePage.tsx` | Rendu QCM/CASES + champ Autre conditionnel |
| `src/server/resolutionSoumission.ts`, `src/shared/scoringEngine.ts` | Résolution Autre sans scorer, exclusion WEIGHTED |
| `src/server/queries.ts` (new: `getMoyennesParCritere`, `getRepartitionOptions`, `getTendanceParCritere`) | KPI par terme |
| `src/client/pages/DashboardPage.tsx`, `SyntheseGlobalePage.tsx` | Tableaux par question, barres motifs, détail NPS |

### Task 1: Admin web+mobile tactile

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/MobileAppHeader.tsx`
- Modify: `src/client/components/PageShell.tsx`
- Modify: `src/client/components/PageHeader.tsx`
- Modify: `src/client/pages/PlanningPage.tsx`
- Modify: `src/client/pages/DashboardPage.tsx`
- Modify: `src/client/pages/AvisPage.tsx`
- Modify: `src/client/pages/GuichetsPage.tsx`
- Modify: `src/client/pages/GestionAgencesPage.tsx`
- Modify: `src/client/pages/AlertesTachesPage.tsx`
- Modify: `src/client/components/ui/dialog.tsx`

**Interfaces:**
- Produces mobile tab-bar with 4 actions (Dashboard, Avis, Alertes, +Créer).
- Produces 44px touch targets on critical admin actions.
- Produces accordion filters (Avis), list-first tabs (Guichets/Agences), bottom-sheet dialogs.

- [ ] **Step 1: Write failing responsive tests** — axe-core + touch-target audit test asserting critical buttons >=44px, dialogs scrollable, no horizontal overflow at 360px.
- [ ] **Step 2: Shell + nav** — tab-bar, `PageShell px-4` mobile, `Toaster bottom-center`, onglets 44px, `theme-color` + `viewport-fit=cover` in `head.wasp.ts`.
- [ ] **Step 3: Pages** — Planning 24px→44px + date `h-11`; Dashboard tableaux→cartes + exports menu unique; Avis filtres accordéon; Guichets/Agences liste d'abord; Alertes boutons pleine largeur.
- [ ] **Step 4: Dialogs bottom-sheet** — `max-h-[90vh] overflow-y-auto rounded-t-3xl` sur mobile pour les 5 dialogs (Alertes création, Guichets kit/confirmations, Planning reconduction/édition/suppression, Agences archivage).
- [ ] **Step 5: Run tests** — `vitest run` ciblé + vérification manuelle 360/390/desktop, commit.

### Task 2: Gabarits Express/Qualité + Autre libre

**Files:**
- Modify: `src/server/scripts/dbSeeds.ts`
- Modify: `src/client/collecte/payload.ts`
- Modify: `src/client/pages/CollectePage.tsx`
- Modify: `src/server/resolutionSoumission.ts`
- Modify: `src/shared/scoringEngine.ts`
- Modify: `src/server/actions.ts`
- Create: `src/server/gabarits.test.ts` (ou étendre existants)
- Create: `src/client/collecte/payload.test.ts` (si absent)

**Interfaces:**
- Produces `Service{Express-30s}` + 4 critères + `Service{Qualité-45s}` + 4 critères seedés.
- Produces `AUTRE_LIBRE` flow: `{optionId, autreTexte}` → `commentaire_texte='Autre — "verbatim"'`, score `NON_NOTABLE`.
- Produces `estAutreLibre(o)` guard in scoring (jamais `EXCLUSIVITE_VIOLEE`).

Seed exact:
- Express: (1) SMILEY `Passage aujourd'hui` obligatoire, (2) QCM `Attente` options [`Moins de 10 min`, `Entre 10 et 30 min`, `Plus de 30 min`] `est_scorable=false`, (3) QCM `Motif` options [`Envoi / Retrait colis ou courrier`, `Services financiers / Mandat / Paiement`, `Boîte postale / Gestion de compte`, `Autre (précisez)` code `AUTRE_LIBRE`], (4) TEXTE `Commentaire ou suggestion` `obligatoire:false`.
- Qualité: (1) SMILEY `Agent a répondu efficacement` ?, (2) SMILEY `Politesse et clarté`, (3) NPS `Recommanderiez-vous` natif, (4) CASES `Problème spécifique` `CATEGORICAL` options [`Panne réseau / Système indisponible`, `Absence monnaie / liquidités`, `File mal organisée`, `Aucun problème` code `EXCLUSIF`, `Autre (précisez)` code `AUTRE_LIBRE`].

- [ ] **Step 1: Write failing tests** — payload `{optionId, autreTexte}` conservé, résolution `NON_NOTABLE` + texte `AUTRE::verbatim`, `WEIGHTED` exclut Autre, `EXCLUSIF` + Autre ne rejette pas.
- [ ] **Step 2: Payload + collecte** — exposer `code_metier` dans `optionsAffichage`, champ `autreTexte`, input conditionnel si `AUTRE_LIBRE` coché, `Continuer` désactivé si vide, `trim/slice 1000`, interdire `•;|`.
- [ ] **Step 3: Résolution + scoring** — `normaliserEntree` garde les deux, `resoudreEntree` score sur id + conserve texte, `estAutreLibre` guard, `construireLigne` concatène, `morceauxIA` envoie `Autre — "verbatim"`.
- [ ] **Step 4: Seeds gabarits** — `dbSeeds.ts` crée les 2 services + 8 critères + `CritereService ordre` + `AgenceCritere`, idempotent (skip si existent).
- [ ] **Step 5: Run tests** — `vitest run` ciblé + soumission manuelle QCM/CASES Autre, commit.

### Task 3: KPI par terme + UI dashboard

**Files:**
- Modify: `src/server/queries.ts`
- Create: `src/server/kpiParTerme.test.ts`
- Modify: `src/client/pages/DashboardPage.tsx`
- Modify: `src/client/pages/SyntheseGlobalePage.tsx`

**Interfaces:**
- Produces `getMoyennesParCritere({id_agence, nbJours})` → `[{id_critere, libelle, type, nb_avis, moyenne/5|null, satisfaction%|null, distribution}]`.
- Produces `getRepartitionOptions({id_critere, id_agence, nbJours})` → `[{optionId, libelle, nb, pct}]`.
- Produces `getTendanceParCritere({id_agence, nbMois?, id_critere?})` → séries mensuelles + série NPS.

- [ ] **Step 1: Write failing KPI tests** — moyenne par critère (satisfaction seule), exclusion TEXTE/NPS, `%` par option avec bon dénominateur, `agregerNPS` mensuel, seuil `n>=5` → `null`.
- [ ] **Step 2: Queries** — implémenter les 3 queries avec `buildAgenceFilter/resolveAgenceScope`, `scoreMoyenParAvis`, `agregerNPS`, `reconnaitreCES/agregerCES`, scope `nbJours [1,90]`.
- [ ] **Step 3: UI** — tableau par question, barres motifs/problèmes, détail NPS (n, promoteurs/passifs/détracteurs), courbes par terme. Enregistrer actions/queries dans `main.wasp.ts` avec entities.
- [ ] **Step 4: Run tests** — `vitest run` ciblé + contrôle dashboard avec seed, commit.
