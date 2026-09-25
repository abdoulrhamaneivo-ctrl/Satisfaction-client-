# ETAT RÉEL DU PROJET — Photographie avant transformation

> **Vague 0 de la campagne Hermes.** Ce document décrit **l'état constaté**, pas
> l'état souhaité. Chaque affirmation porte sa preuve `file:line` et sa
> qualification : *confirmé par lecture directe*, *confirmé par exécution*, ou
> *suspecté*.
>
> - **Projet** : Yeba — plateforme interne de mesure d'expérience client
> - **Dépôt** : `/home/abdoulivo/Bureau/app` — Wasp 0.24 · React 19 · Prisma 5.19.1 · PostgreSQL/Neon
> - **État audité** : branche `main`, commit `f7ed61b`, 2026-09-26
> - **Base auditée** : Neon (pooler `c-6.us-east-2`), 33 tables
> - **Règle appliquée** : aucune affirmation n'est retenue sans preuve ; un
>   commit qui *annonce* une couverture n'est jamais une preuve.

---

## 0. Méthode et preuves d'exécution

Quatre passes d'exploration du dépôt, puis revérification manuelle des constats
les plus graves. Commandes réellement exécutées le 2026-09-26 et leurs sorties
brutes :

| Vérification | Commande | Résultat |
|---|---|---|
| Migrations appliquées | `psql "$DATABASE_URL" -At -c "select count(*), count(*) filter (where finished_at is null) from _prisma_migrations"` | `36 migrations appliquees, echecs=0` |
| Migrations sur disque | `ls -1 migrations \| grep -v migration_lock \| wc -l` | `36` |
| Drift schéma réel | `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel schema.prisma --script` | 18 lignes : **uniquement** la suppression de `Auth`, `AuthIdentity`, `Session` (tables injectées par Wasp) |
| Suite de tests | `npm test` | `Test Files 16 passed (16) — Tests 181 passed (181) — 6.21s` |
| Couverture réelle | `npx vitest run --coverage` | Statements **29,83 %** · Branches **23,07 %** · Functions **25,91 %** · Lines **29,94 %** |
| Volumétrie | `psql … select count(*) …` | `Reponse=0 · AnalyseAvisIA=0 · GlobalExperienceAnalysis=0 · VoteAntiRejeu=0 · User=3` |
| Secrets | `grep -rnE "(apiKey\|API_KEY\|Authorization\|Bearer \|sk-\|nvapi-\|gsk_\|xoxb-)" src/` | aucun secret en dur (noms d'env uniquement) |

**Corollat important de la volumétrie** : la base ne contient **aucune réponse**.
Les chemins de compatibilité historique (`MIGRATED`, `LEGACY_POSITIONAL`) n'ont
donc jamais été exercés contre de la vraie donnée. Toute vague qui touche la
migration de données devra être validée sur un jeu de données recréé.

---

## 1. Ce que le cahier d'audit cherche et qui est DÉJÀ corrigé

Le cahier d'audit demande de rechercher `index + 1`, le score calculé côté
client, et la soumission manuelle. Ces trois points ont été traités par les
vagues précédentes et **ne sont pas des problèmes ouverts**. Le document les
consigne pour qu'un lecteur ne les recense pas à tort :

| Point recherché | État réel | Preuve |
|---|---|---|
| `item.score = index + 1` dans le chemin officiel | **Supprimé.** Aucun scoring officiel ne dépend d'une position. Le client envoie un `optionId` (ou `optionIds[]`, ou `valeur`, ou `texte`) | `src/server/resolutionSoumission.ts:127-273` ; `src/client/collecte/payload.ts:43-72` |
| Score QCM calculé côté client | **Supprimé.** Le client n'envoie aucun score pour QCM/CASES ; le formulaire public n'expose même ni score ni poids | `src/client/collecte/payload.ts:53,69` ; `src/server/queries.ts:694-701` |
| Bouton « Envoyer mon avis » | **Supprimé.** Soumission automatique à la dernière question, accusé 500 ms, autosave du commentaire | `src/client/pages/CollectePage.tsx:51-58,375-393,398-414` |
| `AVG(score_brut)` dans les agrégats | **Supprimé** — il ne reste qu'**une** moyenne SQL, et elle porte sur le champ canonique | `src/server/queries.ts:2069` (`_avg: { score_normalise: true }`) |
| `index + 1` (résiduel) | Présent **uniquement en UX/labels** (numéro de ligne affiché, messages d'erreur) | `src/client/components/EditeurOptions.tsx:52` ; `src/server/actions.ts:2227` |

**En revanche**, des positions fuient encore vers des *libellés* en affichage
(constat P6) et le chemin de **lecture** des scores a un défaut majeur
(constat P2). Le cahier d'audit avait donc raison de chercher : la cible a été
changée, pas le problème.

---

## 2. État actuel — ce qui fonctionne réellement

### 2.1 Architecture

```text
/q/:code (public, QR opaque)      → actions.ts:soumettreAvis → resolutionSoumission
                                      → scoringEngine (pur, déterministe) → Reponse
                                                        ↓
                                       jobs PgBoss : analyserAvisIA (chaque minute)
                                                        ↓
                                       analyserAvisIA (individuel) ─┐
                                       analyserGlobale (lundi 6h)  ─┴→ Agrégats déterministes
                                                        ↓
                            getIndicateursExperience → dashboard · /synthese · exports · rapports PDF
```

- **Espace entreprise** (mono-entreprise, multi-agences) : `Direction`, `Chef d'agence`, `Agent` (+ `Quality` explicitement rejetée par le code, `src/server/middleware/rowLevelSecurity.ts:144-149`).
- **Espace plateforme** : `/platform/*`, rôles `SUPER_ADMIN` / `SUPPORT` (`main.wasp.ts:161-166`).
- **Isolation** : 100 % applicative (filtres Prisma), **aucune RLS PostgreSQL** (0 occurrence de `CREATE POLICY` dans les migrations). Module unique : `src/server/middleware/rowLevelSecurity.ts` (426 lignes, 17 helpers).
- **33 tables** : 27 modèles Prisma + 3 tables d'auth Wasp (`Auth`, `AuthIdentity`, `Session`) + tables de jointure implicites.

### 2.2 Chaîne de mesure (cœur du produit)

| Brique | Fichier | État |
|---|---|---|
| Moteur de scoring pur | `src/shared/scoringEngine.ts` (517 l.) | 9 stratégies, normalisation paramétrique, orientation, 46 tests |
| Module CES | `src/shared/ces.ts` | bandes 1-5 / 1-7, top box, `/100` inversé, 16 tests |
| Résolution serveur | `src/server/resolutionSoumission.ts` | autoritaire, `optionId` uniquement, 18 tests |
| Options persistantes | `schema.prisma:314-347` (`OptionCritere`) | id `cuid` stable, `@@unique([id_critere, libelle_normalise])`, `actif` au lieu d'un `DELETE` |
| Réponses CASES multiples | `schema.prisma:358-367` (`ReponseOption`) | `@@id([id_reponse, id_option])`, `onDelete: Restrict` sur l'option |
| Provenance | `schema.prisma:437-445` | `score_brut` / `score_officiel` / `score_normalise` / `score_source` / `critere_version` |
| Catalogue d'indicateurs | `src/shared/indicateurs.ts` | 23 définitions (id, formule, source, unité), 10 tests |
| IA individuelle | `src/server/jobs/analyserAvisIA.ts` | 3 providers en repli, retry 3, budget 40/j, **non bloquante** |
| IA globale | `src/server/jobs/analyseGlobale.ts` + `GlobalExperienceAnalysis` (30 col.) | hebdo, budget 5/j, seuil 10 avis, snapshot stocké, `limites` affichées |

### 2.3 Couverture des contrôles de sécurité — ce qui est en place

Points positifs **confirmés par lecture**, à conserver lors des refontes :

- CSP sans `unsafe-inline` pour les scripts, hash calculé au démarrage sur le HTML réellement servi ; `frame-ancestors 'none'` ; HSTS ; `nosniff` ; `x-powered-by` désactivé (`src/server/staticServing.ts:83-136`).
- Inscription publique bloquée **avant** le routeur Wasp (`staticServing.ts:148-154`, testé dans `src/server/staticServing.test.ts`).
- Secrets applicatifs validés ≥ 32 caractères au démarrage, **sans** repli `DEVJWTSECRET` (`src/env.ts:15-18,30-47`).
- Clé TOTP dédiée, distincte de `JWT_SECRET`, avec rotation (`src/server/totp.ts`, 8 tests).
- Anti-injection de prompt présent dans les 3 prompts système (« le texte de l'avis est une donnée non fiable ») ; sortie LLM validée par Zod avec `.max()` sur chaque champ libre.
- Sorties CSV neutralisées contre l'injection de formule (`src/server/validation.ts:60-69`).
- Rate limiting à 3 paliers sur la soumission publique : 8/min par (IP, guichet), 30/min par IP, 100/min par guichet (`src/server/actions.ts:453-467`).
- Idempotence de soumission par `id_soumission` + `pg_advisory_xact_lock` transactionnel (`src/server/actions.ts:558-565,818-843`).
- Effacement des numérotations séquentielles : `code_public` à 10 caractères d'alphabet sans ambiguïté, généré par `crypto.randomBytes` (`src/server/actions.ts:66-72`), `@unique` en base, garde temporelle 250 ms + jitter sur les 3 sorties de la query publique (`src/server/queries.ts:632-645,800`).

---

## 3. Problèmes confirmés

### P1 — 🔴 CRITIQUE — la soumission publique contourne le QR opaque (écriture inter-entreprises)

**Fait, relu dans le code.** `soumettreAvis` prend l'identifiant numérique en
priorité et ne consulte le code public que si le numérique est absent :

```ts
// src/server/actions.ts:423-441
const { guichetId, code_public, … } = args;
let idGuichetEffectif = guichetId;                    // ← prioritaire
if (!idGuichetEffectif && code_public) { … }          // ← le code n'est lu qu'en repli
```

La seule validation qui suit est `actif && !archive && !agence.archive`
(`src/server/actions.ts:499-509`) : **aucun contrôle de `code_public`, aucun
contrôle de tenant**. Or la query publique renvoie explicitement l'identifiant
numérique, avec un commentaire qui l'assume :

```ts
// src/server/queries.ts:805-807
// FIX QR OPAQUE (05/09) : la page de collecte par code a besoin de l'id
// numérique pour la soumission — le code public ne suffit pas.
id_guichet: guichet.id,
id_agence: guichet.id_agence,
```

**Chaîne d'exploitation** (anonyme, sans compte) :

1. un tiers scans un QR légitime → obtient `id_guichet` (entier, petit et
   séquentiel) ;
2. énumère `id_guichet` des autres agences/entreprises (2, 3, 4…) ;
3. soumet un avis en envoyant `guichetId` au lieu du `code_public` ;
4. les critères sont validés contre l'**agence cible** (`actions.ts:619-628`),
   et les critères « socle » (`id_entreprise = NULL`, catalogue partagé
   `queries.ts:563-566`) sont actifs dans plusieurs agences → le critère passe ;
5. une ligne `Reponse` est écrite dans une autre entreprise, avec les effets
   de bord `VoteAntiRejeu` et `Alerte`.

**Impact** : intégrité de la mesure (fausses données dans le tableau de bord d'un autre
client), pas de fuite de données. **Correction** : rendre `code_public`
obligatoire sur l'action publique (une ligne), et arrêter de renvoyer
`id_guichet`/`id_agence` dans la query publique.

**Statut** : confirmé par lecture directe des deux fichiers. Régression
introduite par le correctif « QR opaque » du 05/09 lui-même.

---

### P2 — 🔴 ÉLEVÉ — 8 agrégats sur 10 ignorent le score canonique ; le CES y est inversé

Le champ `score_normalise` (canonique, `/100`) **n'est pas sélectionné** par les
requêtes d'agrégation. Elles retombent sur `scoreNormaliseSur5`, qui recalcule
depuis `score_brut` :

| Requête | `select` | `score_normalise` présent |
|---|---|---|
| `getObjectifs` | `queries.ts:1049-1054` | non |
| `getTendanceMensuelle` | `queries.ts:1260-1266` | non |
| `getStatsByAgent` | `queries.ts:1327-1333` | non |
| `getStatsByGuichet` | `queries.ts:1394-1400` | non |
| `getKPIsPeriode` (×2) | `queries.ts:1530-1540,1544-1549` | non |
| `getComparaisonAgences` (×2) | `queries.ts:1775-1782,1833-1839` | non |
| `getHeatmapReponses` | `queries.ts:1907-1913` | non |
| `jobs/rapportMensuel.ts` | `:41-46` | non |
| `getAvisGroupes` / `exportAvisGroupes` | `queries.ts:264-276,397-409` (include) | **oui** |
| `moteurGlobal` (zone Expérience) | `moteurGlobal.ts:151-164` | **oui** |

Conséquence la plus grave — le recalcul legacy ignore `orientation` :

```ts
// src/server/soumissions.ts:109-117  (identique client/utils.ts:45, DashboardCharts.tsx:193)
if (type === 'ECHELLE') {
  const ratio = (reponse.score_brut - min) / (max - min);
  return Math.max(1, Math.min(5, 1 + ratio * 4));   // effort 7/7 → 5/5 étoiles
}
```

Un client qui répond « Très difficile » (7/7 sur une question d'effort) devient
**5/5 étoiles** dans le KPI, la tendance, le classement des guichets, la
comparaison d'agences, la heatmap, le rapport mensuel et les objectifs. La zone
« Expérience client » (canonique) affiche simultanément la valeur correcte :
**deux CSAT différents sur le même écran**.

Corollats du même défaut :

- **NPS 1-5 compté en étoiles de satisfaction** : `DashboardCharts.tsx:187` n'exclut que `TEXTE|CASES|QCM` ; une note NPS de 3 passe le test `>= 1 && <= 5` et entre dans l'histogramme de satisfaction (les 6-10 sont jetés) — `DashboardCharts.tsx:196`, `soumissions.ts:119`, `client/utils.ts:47`.
- **`0/100` ramené à `1/5`** : `Math.max(1, …)` (`soumissions.ts:100`) écrase toute la bande `[0,20)` sur la même valeur, donc les seuils `≥4` / `≤2` ne correspondent pas aux bandes documentées (`indicateurs.ts:24-30`).
- **Quatre implémentations divergentes** de la même normalisation : `soumissions.ts:94-120` (référence), `client/utils.ts:28-48`, `DashboardCharts.tsx:185-197` (sans branche `score_normalise`), `LigneReponse.tsx:24-30` (sans branche `score_normalise`), plus une cinquième variante dans `CollectePage.tsx:957-969`.

---

### P3 — 🔴 ÉLEVÉ — `PROCESSING` est un état définitivement mort dans le job IA

`analyserAvisIA` écrit `PROCESSING` (`:164`) puis ne le re-sélectionne jamais :
la sélection ne vise que `{ status: 'PENDING' }` (`:114`). Aucun ramasse-miettes,
aucune reprise sur `updatedAt` (la colonne existe, `schema.prisma:528`).

```bash
grep -rn "PROCESSING" src/   # 3 occurrences : l'écriture, son commentaire, le badge
```

Tout crash, OOM, redéploiement ou worker PgBoss tué entre `:161` et `:273` laisse
la ligne en `PROCESSING` **définitivement** → `AIAnalysisBadge.tsx:50-57` affiche
un « Analyse IA en cours… » éternel. Perte silencieuse de qualité de données.

---

### P4 — 🟠 ÉLEVÉ — l'analyse globale `FAILED` est terminale et non rattrapable

`analyseGlobale.ts:197-202` ne traite que `PENDING` ; le `catch` (`:173-179`)
pose `FAILED` sans compteur. Le déclencheur manuel fait
`upsert({ …, update: {} })` (`globalExperience.ts:58-74`) : il ne remet donc
jamais une ligne échouée en file, et répond
`dejaExistante: status !== 'PENDING'` → l'écran affiche « Analyse déjà
disponible » sur une ligne morte. Un incident fournisseur à 6h le lundi suffit à
perdre définitivement la synthèse de la semaine.

---

### P5 — 🟠 MOYEN — la synthèse globale est lisible par tout rôle du tenant

`getAnalysesGlobales` fait `requireAuth` + filtre `id_entreprise` mais **aucun
`requireRole`** (`src/server/globalExperience.ts:18-36`) : un `Agent` lit le
résumé exécutif, les irritants et les priorités. Le sibling
`getIndicateursExperience` réserve pourtant la synthèse aux `DIRECTION`
(`queries.ts:2329`). Le module RLS documente explicitement que « le front n'est
jamais la protection » (`rowLevelSecurity.ts:372-373`).

---

### P6 — 🟠 MOYEN — une position fuit encore vers un libellé (et peut nommer la mauvaise option)

```ts
// src/server/queries.ts:432   (idem src/client/utils.ts:59, LigneReponse.tsx:16-22)
`${lib}: ${specifique || options[r.score_brut - 1] || `Option n°${r.score_brut}`}`
```

`score_brut` est un **score sémantique**, pas une position. Pour un QCM saisi
`Très satisfait, Neutre, Très insatisfait` avec `scores_reponse = 5,3,1`, un
`score_brut = 2` affiche `options[1]` = **« Neutre »** alors que le client a
coché « Très insatisfait ». Le libellé correct est déjà stocké dans
`commentaire_texte` (`actions.ts:772-773`) et le code le préfère — le repli ne
se déclenche que si le texte est vide ou identique au commentaire de groupe.
Ligne liée : `LigneReponse.tsx:96` (`score_brut >= 4` pour reconstruire un
Oui/Non au lieu d'utiliser la valeur stockée).

---

### P7 — 🟠 MOYEN — accessibilité : 3 blocants sur la page la plus utilisée

| Constat | Mesure | Requis | Preuve |
|---|---|---|---|
| Anneau de focus invisible | `ring-ring/40` = #00A851 à 40 % sur blanc → **1,58:1** | 3:1 | `CollectePage.tsx:49` (appliqué à tous les boutons d'options) |
| Texte de marque illisible | `text-primary` #00A851 sur crème → **3,12:1** | 4,5:1 | `CollectePage.tsx:476-478,497-500` |
| Verdict de santé réseau illisible | `text-warning` sur `bg-warning/5` → **1,49:1** | 4,5:1 | `DashboardPage.tsx:478-480` ; `DashboardSummary.tsx:44-46` |
| Cible tactile trop petite | bouton « Réessayer » ≈ **16-19 px** de haut | 24×24 px (2.5.8) | `CollectePage.tsx:902-916` |
| Statut non annoncé | régions `role="status"` / `role="alert"` **montées avec** leur contenu | 4.1.3 | `CollectePage.tsx:1013-1014,593-605` |
| Étapes muettes | `t1.etat === 'encours'` ne rend rien (ni spinner ni `aria-busy`) | 4.1.3 | `CollectePage.tsx:277` |
| Graphiques inaccessibles | Recharts sans `role="img"`, sans alternative, infobulles au survol seul | 1.1.1 | `DashboardCharts.tsx:176-197,325-329,376-383,420-428` |
| Étiquettes non associées | `<label>` frère du contrôle sur la page publique et sur 7 filtres d'AvisPage | 1.3.1 / 4.1.2 | `CollectePage.tsx:864-887` ; `AvisPage.tsx:303-429` |
| Pas de radiogroup ni flèches | les 5 groupes d'options sont des `button aria-pressed` | 4.1.2 | `CollectePage.tsx:614-829` |
| Bloquage silencieux | `crypto.randomUUID()` appelé **hors du `try`** (démarre ligne 279) → sur borne en HTTP non sécurisé : rejet non géré, aucun message | — | `CollectePage.tsx:276-279` |

Le motif correct existe déjà dans le dépôt (`SettingsPage.tsx:322-365`,
`components/FormField.tsx:30-38`) et n'est simplement pas appliqué à la collecte.

---

### P8 — 🟠 MOYEN — le garde anti-rejeu téléphone est inopérant

Le bloc de rejet est conditionné à la réception d'un téléphone
(`actions.ts:472` `if (telephone)`), et le client envoie `telephone: undefined`
en T1 (`CollectePage.tsx:285-287`). Ni le `findFirst` + rejet 429
(`actions.ts:486-496`) ni l'`upsert` (`:714-736`) ne sont donc jamais exécutés
depuis le parcours public. La protection réelle repose uniquement sur le rate
limiting. Aggravant : l'`upsert` ne peut de toute façon pas matcher (le `where`
utilise `new Date()` au milliseconde près, différent du `create`) → croissance
non bornée entre deux purges.

---

### P9 — 🟠 MOYEN — le budget de l'IA globale sature dès la 3ᵉ entreprise

Budget = 5 appels/jour (`analyseGlobale.ts:26`), 2 lignes par entreprise et par
semaine (SEMAINE + MOIS, `:187-190`). À partir de 3 entreprises, 6 lignes sont
mises en file pour 5 appels : au moins une reste `PENDING` chaque semaine, et le
lundi est le seul déclenchement. Pire, le budget est consommé par des
traitements sans LLM (volume insuffisant), contrairement au job individuel qui
exclut correctement `model: { not: null }` (`analyseGlobale.ts:34-36` vs
`analyserAvisIA.ts:140-143`).

---

### P10 — 🟠 MOYEN — le LLM peut persister une priorité qu'il a inventée

Les contraintes du prompt sont de la prose, le schéma Zod ne borne que des
longueurs (`src/server/ai/types.ts:169-184`). Un seul champ numérique est
ré-écrit par le serveur — et encore, avec un repli qui laisse passer
l'inv :

```ts
// src/server/jobs/analyseGlobale.ts:152-157
priorite: irritants.find((d) => d.theme === i.theme)?.priorite ?? i.priorite,
```

Un thème absent de la liste déterministe conserve la priorité fabriquée par le
modèle (0-100, donc plausible). Les champs texte libres (`resumeExecutif`,
`pointsPositifs`, `tendances`, `anomalies`, `priorites`, `limites`) sont affichés
tels quels à la direction (`SyntheseGlobalePage.tsx:266-320`). Aucun XSS (React
échappe), mais une intégrité de chiffre en jeu.

---

### P11 — 🟠 MOYEN — surface publique : trois trous de contrôle

| Trou | Preuve | Effet |
|---|---|---|
| `getFormDefinitionForGuichet` sans rate limit | `queries.ts:634-826` | endpoint public non authentifié, aucune protection anti-bot (disponibilité/coût) |
| `args.responses` sans borne supérieure | `actions.ts:574` | un seul appel peut envoyer un `IN (...)` arbitrairement grand (50 ids max **par entrée**, pas de max d'entrées) |
| Commentaire > 1000 caractères → **500** | `validation.ts:52` lève un `Error` ordinaire appelé hors du `try` (`actions.ts:784-786`) | erreur serveur générique au lieu d'un 400 actionnable |
| `completerSoumission` public sans rate limit | `actions.ts:1042-1129` | amplification d'écritures (commentaire + vote + file IA) |
| `REDIS_URL` optionnel | `src/env.ts:38`, `rateLimit.ts:92-94` | sans Redis, le rate limit est **par instance** : contournable en multi-instance |
| IP de confiance non configurée | `rateLimit.ts:141-155` (1ᵉʳ `x-forwarded-for`), pas de `trust proxy` dans `staticServing.ts` | IP falsifiable → contournement du rate limit + IP d'audit falsifiée |

**Contrôles qui fonctionnent** sur cette même surface, pour équilibre : code
opaque 32¹⁰ ≈ 1,15 × 10¹⁵, anti-énumération (format invalide, guichet inactif
et code inconnu rendent tous `null`), garde temporelle 250 ms + jitter sur les 3
sorties, validation serveur rejouée intégralement, idempotence transactionnelle.

---

### P12 — 🟠 MOYEN — objectifs : la bonne implémentation existe mais n'est pas appelée

`getObjectifsParAgence` (`queries.ts:2056-2093`) fait exactement ce qu'il faut —
`_avg` SQL sur `score_normalise`, `/100` sans reconversion, NULL exclus par SQL.
Elle est enregistrée dans `main.wasp.ts:450` mais **aucun composant client ne
l'appelle** (`grep getObjectifsParAgence src/client/` → 0 résultat). Le
dashboard consomme `getObjectifs` (`queries.ts:1017-1095`), qui recalcule depuis
`score_brut` puis applique `(moyenne / 5) * 100` (`:1088`) — la cible saisie par
l'utilisateur (0-100, `ObjectifsPanel.tsx:67-70`) est donc comparée à un nombre
dérivé autrement.

---

### P13 — 🟠 MOYEN — deux fenêtres de perte de données sur la page publique

| Cas | Preuve | Effet |
|---|---|---|
| « Passer » pendant le debounce T2 | `CollectePage.tsx:438-448` — `clearTimeout` **sans** `sauvegarderT2()` ; l'effet ne se rejoue plus car `step !== 'COMMENT_STEP'` | commentaire perdu |
| Fermeture d'onglet pendant le debounce ou l'appel en vol | `CollectePage.tsx:134-137` annule les timers au démontage | commentaire non garanti écrit |
| Reset forcé à 10 s sur l'écran de merci | `CollectePage.tsx:359-373` | le récapitulatif disparaît pendant sa lecture (non annoncé) |
| Aucune persistance du formulaire | aucune écriture `localStorage`/`sessionStorage` dans `CollectePage.tsx` ni `src/client/collecte/` (vérifié) | rechargement / onglet fermé = tout perdu |

### P14 — 🟡 FAIBLE — dette et incohérences secondaires

| # | Constat | Preuve |
|---|---|---|
| a | `DATA_QUALITY_SCORE` défini deux fois avec deux formules (5 termes pondérés vs 3 termes) ; celle qui tourne n'est pas celle documentée | `indicateurs.ts:112-137` vs `moteurGlobal.ts:405-409` |
| b | `score_source` et `critere_version` écrits et **jamais lus** (aucune query, aucun export, aucune UI) | `actions.ts:781-782` |
| c | CSAT calculé par ligne dans le moteur global, par soumission partout ailleurs ; `volume` compte des lignes dans le même objet | `moteurGlobal.ts:180,313,331` vs `soumissions.ts:127-137` |
| d | Score d'option accepté 1-20 par l'action, rejeté 1-5 par le parseur CSV → un score 6-20 produit un CSV que le parseur rejette en bloc et retombe sur l'inférence lexicale | `actions.ts:2235-2237` vs `scoringQCM.ts:45` |
| e | `duplicateCritere` copie `options_reponse` mais pas `scores_reponse` | `actions.ts:2924-2938` |
| f | Code mort : `resoudreScoreQCM`, `resoudreScoreCASES`, `estCritereNote`, `note5Vers100`, `resoudreTexte` (inatteignable), `verifierEntrepriseActive` | `scoringQCM.ts:279-346`, `scoringEngine.ts:108,446`, `rowLevelSecurity.ts:406` |
| g | `SYSTEM_PROMPT` dupliqué en 3 copies à garder synchronisées ; `max_tokens` divergents (1500 / 1500 / 1000) ; `PROMPT_VERSION` = chaîne manuelle | `nvidiaProvider.ts:10-53`, `openrouterProvider.ts:6-49`, `deepseekProvider.ts:6-49,106` |
| h | Sélection IA sans `orderBy` (backlog non FIFO) ; `attempts` incrémenté sans garde atomique | `analyserAvisIA.ts:111-130,270` |
| i | `UserSession` + `SESSION_SECRET` déclarés, validés, jamais lus ; `StatistiquesMensuelles`, `Logs`, `Reponse.audio_url` morts ; `logo_dark_url` lu côté client sans colonne | `schema.prisma:824-837`, `src/env.ts:46`, `BrandLogo.tsx:21` |
| j | Aucun `enum` en base : ~20 jeux de valeurs sont des `String` libres (`type_reponse`, `scoring_mode`, `status`, …) | `schema.prisma` (0 bloc `enum`) |
| k | Migration `2026092700000x` modifie la table `Session` de Wasp puis `…00100` l'annule : appliqué seul sur une base non vide, `ADD COLUMN "tokenHash" NOT NULL` échoue ; si `…00000` passe et `…00100` échoue, **le login Wasp est cassé en production** | `migrations/20260927000000_drift_session_vote_totp/migration.sql:13-26` |
| l | Conséquence de (k) : le couple est lié à un état « base vide » documenté dans un commentaire | `…/migration.sql:5` |

---

## 4. Risques classés

| Niveau | Nb | Risques |
|---|---|---|
| **CRITIQUE** | **1** | P1 — écriture publique inter-entreprises (intégrité de la mesure) |
| **ÉLEVÉ** | **3** | P2 — agrégats non canoniques + CES inversé · P3 — état IA `PROCESSING` mort · P4 — synthèse globale non rattrapable |
| **MOYEN** | **9** | P5 rôle manquant sur la synthèse · P6 libellé depuis une position · P7 a11y bloquants · P8 anti-rejeu inopérant · P9 plafond de budget IA · P10 priorité LLM inventée · P11 surface publique (3 trous + 2 weaknesses) · P12 objectifs sur mauvaise formule · P13 pertes de données |
| **FAIBLE** | **14** | P14 a→l (dette, code mort, index, enums, migrations liées) |

**Aucun risque CRITIQUE n'est présent sur le chemin d'authentification** : 34/35
queries et 36/40 actions portent `requireAuth` + scope tenant ; les 4 actions
sans authentification sont publiques **par conception** (`soumettreAvis`,
`completerSoumission`, `demanderReinitialisation`, `activerCompte`) et toutes
sont validées côté serveur. La console `/platform` applique
`requirePlatformRole(['SUPER_ADMIN','SUPPORT'])` partout.

---

## 5. Dette technique

| Zone | Dette | Effet |
|---|---|---|
| **`deploy/`** | 1 871 fichiers **suivis par git** (alors que c'est un artefact de build), figés **10 migrations en retard**, `deploy/db/schema.prisma` sans `ModeleHoraire`, `OptionCritere`, `ReponseOption`, `GlobalExperienceAnalysis`, `UserSession` ; contient encore `index + 1` et `AVG(score_brut)` (`deploy/src/server/queries.ts:1673`) | risque de déployer la mauvaise arborescence ; bruit dans les diffs ; fausse source de vérité pour un lecteur pressé |
| Normalisation du score | 4-5 implémentations divergentes du `/5` | toute correction doit être faite 5 fois, et une seule a été corrigée |
| Requêtes non paginées | 53 `findMany` pour 11 `take` dans `queries.ts` | pas de pagination sur la majorité des listes ; charge mémoire côté serveur |
| Index | aucun index sur `Reponse.id_critere`, `id_service`, `id_canal`, `id_agent` ; aucun `@@index` sur `id_entreprise` de `User`, `Critere`, `Service` (supprimés en `20260714062828` puis jamais remis) | scans sur les agrégats par critère/service et sur les listings par tenant |
| Code mort | 6 fonctions + 3 modèles (`StatistiquesMensuelles`, `Logs`, `UserSession`) + 1 champ (`audio_url`) + 1 branche UI (`logo_dark_url`) | surface de confiance trompeuse |
| Duplication IA | 3 prompts système quasi identiques, 3 schémas de retry | toute évolution de prompt doit être répliquée 3 fois sans garde |
| Config deploy | `render.yaml` ne déclare que 3 variables ; `DATABASE_URL`, `JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, `SESSION_SECRET`, `ANTI_REPLAY_SALT`, clés IA et Twilio sont gérées dans le dashboard Render (non versionnées, donc non auditées) | une variable manquante au déploiement = démarrage en échec (`src/env.ts` est strict) — c'est un bon garde-fou, mais l'écart entre le fichier et la réalité est invisible |
| Migration | `scripts-render/start-render.sh` : réveil Neon + 6 tentatives de migration espacées de 30 s, avec mise en garde « un seul deploy à la fois » | fragile mais documenté ; un double déploiement manuel+auto peut faire échouer le boot |

---

## 6. Dépendances

- **Runtime** : 40 dépendances de production, 20 de développement.
- **Tests** : `vitest` seul. **Aucun** outil de test de composant, **aucun**
  navigateur piloté, **aucun** outil de couverture dans `package.json`
  (`@vitest/coverage-v8` est présent dans `node_modules` mais non câblé).
- **Limite structurelle** : `vitest.config.ts:15-24` redirige `wasp/server` vers
  un mock dont `prisma` est **un objet vide** — aucun test ne peut donc exercer
  un chemin qui touche `prisma.*` directement. C'est la raison structurelle pour
  laquelle les jobs ne sont pas testés.
- **Limite de collection** : `vitest.config.ts:9` n'inclut que `src/**/*.test.ts`
  — un futur `*.test.tsx` serait **silencieusement ignoré**.
- **CI** : aucun workflow GitHub Actions dans le dépôt.
- **Client** : `@testing-library/*` absent → les tests de parcours et
  d'accessibilité exigent un outillage supplémentaire (à valider avant toute
  vague qui les réclame).

---

## 7. Drift base de données

**Verdict : aucun drift applicatif.** C'est le point le plus net de cet audit.

| Contrôle | Résultat |
|---|---|
| Dossiers de migration sur disque | **36** |
| Lignes dans `_prisma_migrations` | **36**, dont **0** inachevée (`finished_at is null`) |
| `prisma migrate diff --from-url <Neon> --to-schema-datamodel schema.prisma` | 18 lignes : **uniquement** `DROP` de `Auth`, `AuthIdentity`, `Session` |

Les trois tables citées sont celles que Wasp **injecte** lui-même (elles
n'existent pas dans `schema.prisma` mais sont générées dans
`.wasp/out/db/schema.prisma`). Le delta est donc artifactuel : **le schéma
applicatif correspond exactement à la base en production.**

Autres constats de la couche données :

- **Aucune contrainte d'énumération** en base : les ~20 jeux de valeurs sont des
  `String` (`type_reponse`, `scoring_mode`, `orientation`, `status`,
  `statut_alerte`…). Une valeur inventée est acceptée partout.
- **Tenant non dénormalisé** sur les tables à fort volume : `Reponse`,
  `AnalyseAvisIA`, `Alerte`, `TacheCorrective` n'ont pas `id_entreprise` ; le
  tenant s'obtient par `id_agence → Agence.id_entreprise` (1 à 4 sauts). Toute
  query oubliant le filtre `id_agence` traverse les entreprises.
- **Cohérence inter-tenant non garantie** sur `CritereService` : la table relie
  un `Critere` (tenant nullable) à un `Service` (tenant nullable) sans contrainte
  que les deux appartiennent au même tenant (`schema.prisma:375-390`).
- **Modèle mort** : `StatistiquesMensuelles` (table + 4 FKs, aucun index, aucun
  code) ; `Logs` (OpenSaaS, jamais écrit) ; `UserSession` (table créée par la
  migration `…00100`, jamais lue, absente des `entities:` de `main.wasp.ts`).
- **Pairage de migrations à ne pas séparer** : `20260927000000` +
  `20260927000100` (cf. P14 k).
- **Pas de RLS PostgreSQL** : l'isolation est 100 % applicative.

---

## 8. Scoring actuel

### 8.1 Chemin d'écriture — correct

Point positif majeur, à préserver : le score officiel est **calculé côté serveur
et jamais par le client**, pour les 7 types, à partir de l'**identité** de
l'option.

| Type | Fonction | Base du calcul |
|---|---|---|
| SMILEY | `resolutionSoumission.ts:246-257` | entier validé 1-5, `/100 = (s−1)×25` |
| OUI_NON | `scoringEngine.ts:214-227` | booléen + `orientation` du critère → 5/100 ou 1/0 |
| QCM | `scoringEngine.ts:182-206` | **`optionId`** → score sémantique de l'option |
| CASES pondéré | `scoringEngine.ts:360-396` | **`optionIds[]`** → 100 + Σ poids, clampé 0-100 |
| CASES catégoriel | `scoringEngine.ts:401-406` | `NULL` (jamais de note artificielle) |
| ECHELLE | `scoringEngine.ts:231-250` | valeur + bornes stockées |
| ECHELLE / CES | `scoringEngine.ts:262-278` | idem, orientation **forcée** `LOWER_BETTER` |
| NPS | `scoringEngine.ts:288-300` | 0-10 natif, `nps = v × 10`, catégorie |
| TEXTE | `resolutionSoumission.ts:134-142` | `NULL` (jamais de note) |

Repli de compatibilité : si le client envoie un libellé au lieu d'un id
(QCM/CASES/OUI_NON/TEXTE), le serveur apparie par libellé normalisé et marque
`MIGRATED` (`resolutionSoumission.ts:114-121,149-161,183-204`). Un critère CASES
resté sans `scoring_mode` retombe sur la moyenne des options cochées, marquée
`MIGRATED` (`resolutionSoumission.ts:175-179`). Ces chemins écrivent un score —
mais toujours **un score réel d'option**, jamais une position.

### 8.2 Chemin de lecture — incorrect (P2, P6, P12)

C'est là que se situe le travail restant : 8 agrégats sur 10 recalculent au lieu
de lire, quatre implémentations divergent, et trois affichages reconstruisent un
libellé depuis une position.

### 8.3 Versionnement

`Critere.version` s'incrémente à chaque changement de scoring
(`actions.ts:2615`) et `Reponse.critere_version` reçoit la valeur au moment de
l'écriture (`actions.ts:782`). **La règle d'immuabilité est donc en place et
fonctionnelle** ; elle n'est simplement pas lue nulle part (P14 b) et n'est pas
documentée dans un fichier dédié (livrable manquant de la Vague 1).

---

## 9. IA actuelle

### 9.1 Analyse individuelle

- **Déclenchement** : à la première réponse de la soumission (`actions.ts:918-925`), dans un `try/catch` qui ne fait qu'un `console.warn` → **la soumission client n'est jamais bloquée** (confirmé, et c'est le bon choix).
- **Exécution** : job PgBoss, cron `* * * * *` (`main.wasp.ts:500-504`), 10 éléments par tick.
- **Statuts** : `PENDING` → `PROCESSING` → `DONE` / `FAILED` ; `SKIPPED` existe comme valeur de retour, jamais persisté.
- **Retry** : 3 tentatives, `FAILED` ré-sélectionné sous `attempts < 3` (`analyserAvisIA.ts:12,113-116,270-271`). Correct — sauf l'état `PROCESSING` (P3).
- **Timeout** : 25 s par provider. Au pire : 10 × 3 × 25 s ≈ **750 s d'occupation d'un worker**, sans `timeout` de job (MOYEN).
- **Fournisseurs** : primaire = `AI_PROVIDER`, repli `nvidia → openrouter → deepseek` selon clés configurées ; `provider` et `model` effectifs persistés (bonne traçabilité).
- **Traçabilité** : `promptVersion` écrit ; `analysisVersion` **déclaré mais jamais écrit** (reste `"1"`).
- **Cohérence** : `coherenceNote` est une *analyse* (note élevée + texte négatif), elle ne réécrit jamais la note — **le point le plus important du cahier est respecté** : aucun chemin, aucun, ne permet à l'IA d'écrire un score (`score_source` n'a pas de membre `AI`, `schema.prisma:443-446`, et l'exclusion est vérifiable par lecture des seuls sites d'écriture `actions.ts:778-780` et `resolutionSoumission.ts:140,254-269`).
- **Effet de bord assumé** : l'IA peut déclencher des alertes `IA_URGENCE` / `IA_INCOHERENCE_NOTE` à partir de champs qu'elle produit (`analyserAvisIA.ts:256-264`), et `getActionsPrioritaires` promeut `IA_URGENCE` en gravité « haute ». Les seuils déterministes (`NOTE_CRITIQUE` ≤ 40/100) ne sont pas affectés.
- **Données envoyées** : commentaire + note brute + contexte minimal ; téléphone jamais transmis au fournisseur. Conforme au cahier.

### 9.2 Analyse globale

- **Planning** : lundi 6 h, idempotent (`@@unique([id_entreprise, periode, debut])` + `upsert`).
- **Snapshot** : volumes et indicateurs déterministes stockés sur chaque ligne, y compris quand le volume est insuffisant (aucun appel LLM, `limites` explicite). **Bonne pratique.**
- **Traçabilité** : `model`, `provider`, `promptVersion`, `analysisVersion`, `confiance`, `limites` — la page `/synthese` affiche le rappel de sens du CES et les limites.
- **Faiblesses** : P4 (non rattrapable), P9 (plafond de budget), P10 (priorité inventée), et un `error` brut exposé au client (`SyntheseGlobalePage.tsx:272-275`) qui divulgue des détails de fournisseur.

---

## 10. UX actuelle

Parcours réel, tracé dans le code :

```text
/ q /:code  →  [chargement]  →  sélection d'opération (auto-saut si 1 service)
   →  question i  →  tap  →  accusé 500 ms  →  auto-advance (transition 180 ms)
   →  dernière question  →  soumission T1 automatique (aucun bouton)
   →  étape commentaire  →  autosave 900 ms  →  « Merci » 1400 ms après le save
   →  récapitulatif  →  reset automatique à 10 s (borne) ou bouton « Nouvel avis »
```

- **Le bouton « Envoyer mon avis » n'existe plus** (vérifié par recherche : zéro occurrence dans le code actif). Il reste **2 boutons manuels légitimes** : « Continuer » pour TEXTE (`:704-710`) et pour CASES (`:816-822`), tous deux obligatoires puisqu'une saisie libre ou multi-choix ne s'auto-avance pas.
- **Double-tap** : protégé par `if (accuse !== null) return` pendant 500 ms, puis par l'état `encours` et l'idempotence serveur.
- **Borne** : reset à 10 s, `100dvh`, aucune position `fixed`, cibles 44-88 px, `touch-action: manipulation` global, zoom autorisé (`maximum-scale=5.0`).
- **Ce qui reste à corriger** : P7 (a11y), P13 (pertes de données), le blocage silencieux de `crypto.randomUUID()`, la barre de progression coupée à 320 px dès 12 questions (`CollectePage.tsx:1038-1064`), les libellés NPS sans `flex-wrap` (`:772-775`), et l'absence totale de test de parcours (§ 11).

---

## 11. Accessibilité actuelle

Voir P7 pour les 10 constats chiffrés. Compléments :

- **Conforme et à conserver** : `role="progressbar"` avec `aria-valuenow` sur la progression (`:564-576`) ; `aria-current="page"` dans la navigation ; focus déplacé vers le titre de la nouvelle question (`:140-142`) ; `aria-hidden` sur les icônes décoratives ; `aria-live` pré-monté sur l'étape commentaire (`:893-918`) ; pattern `aria-invalid` + `aria-describedby` déjà implémenté dans `SettingsPage` ; `prefers-reduced-motion` neutralisant les animations CSS (`Main.css:206-220`) et les composants `Reveal`/`StatCard`/`Confetti`.
- **Non conforme et à corriger** : anneau de focus 1,58:1 ; contrastes 3,12:1 et 1,49:1 ; « Réessayer » 16 px ; régions live montées conditionnellement ; `<label>` non associées ; pas de `radiogroup` ni de navigation flèches ; pas de skip link ; `OnboardingTour` sans `role="dialog"`, sans piège de focus, sans `Escape` (`OnboardingTour.tsx:104-205`) ; `CommandPalette` sans piège de focus ni restauration (`:223`) ; `DataTable` `<tr onClick>` sans `tabIndex` (`:47-56`) ; heatmap `overflow-x-auto` sans `tabIndex={0}` (`HeatmapReponses.tsx:102`) ; onglets sans `role="tabpanel"` (`AlertesTachesPage.tsx:377-402`) ; `aria-label` sur `<span>` sans rôle (`CollectePage.tsx:1038`).
- **Note de conception** : corriger les contrastes **ne doit pas** modifier le vert de marque `#00A851` (charte `docs/frontend/04-charte-graphique-poste-ci.md`, contratuel). La correction propre est d'ajouter des variantes assombries réservées à l'usage en texte sur fond teinté, et de documenter ces variantes dans la charte.

---

## 12. Tests actuels

**Résultat réel : 16 fichiers, 181 tests, 6,21 s, tout vert.** Un commit qui
annonce une couverture n'est pas une preuve — voici la preuve.

### 12.1 Ce que couvrent réellement les 16 fichiers

| Fichier | Tests | Nature |
|---|---|---|
| `shared/scoringEngine.test.ts` | 38 | le plus solide : ordre libre des options, orientation, bornes, NPS, CASES, TESTS, CES, configs invalides → `AMBIGU` |
| `server/gex/moteurGlobal.test.ts` | 13 | priorité déterministe exacte, confiance, périodes, **CES uniquement** via un faux `db` |
| `shared/ces.test.ts` | 16 | bandes 1-5/1-7, top box, monotonie, volume vide |
| `server/resolutionSoumission.test.ts` | 18 | identité `optionId` vs position, repli libellé `MIGRATED`, option inconnue/inactive → 400, bornes d'entrée |
| `client/collecte/payload.test.ts` | 17 | construction de payloads par type, libellés CES, bornes par défaut |
| `shared/indicateurs.test.ts` | 10 | bandes CSAT, médiane, `N/A` sans dénominateur, décomposition qualité |
| `server/totp.test.ts` | 8 | AES-GCM, refus de clé absente, rotation, migration `JWT_SECRET` |
| `server/isolation.test.ts` | 9 | **seul** test touchant actions/queries : `updateAgent`, `deleteAgent`, `getAIStatus`, `getReponses`, prédicats de rôle |
| `shared/scoringQCM.test.ts` | 13 | inférence lexicale, négations, garde-fous faux positifs |
| `server/ai/types.test.ts` | 6 | schémas Zod v1/v2, `evaluerCoherenceNote` — **ne touche aucun provider** |
| `client/criteres/optionsForm.test.ts` | 4 | migrations de formulaires d'options |
| `client/pages/SyntheseGlobalePage.test.ts` | 4 | parsing défensif, libellés de période |
| `server/security/platformMfa.test.ts` | 3 | garde-fous booléens 2FA |
| `server/security/policies.test.ts` | 2 | signup public, propriété de clé S3 |
| `client/collecte/routeParams.test.ts` | 2 | format du code opaque |
| `server/staticServing.test.ts` | 1 | 1 seul comportement sur ~10 (404 signup) |

### 12.2 Couverture réelle (mesurée, pas déclarée)

| Zone | Statements | Branches |
|---|---|---|
| **Ensemble** | **29,83 %** | **23,07 %** |
| `src/server/actions.ts` (3 393 l.) | **7,27 %** | 4,17 % |
| `src/server/queries.ts` (2 374 l.) | **8,51 %** | 5,61 % |
| `src/server/middleware/rowLevelSecurity.ts` | 46,93 % | 47,43 % |
| `src/server/soumissions.ts` | **0 %** | 0 % |
| `src/server/validation.ts` | **0 %** | 0 % |
| `src/server/audit.ts` | **0 %** | 0 % |
| `src/server/ai/service.ts` + 3 providers + `chatJson` | **0 %** (non importés) | 0 % |
| `src/server/jobs/**` | **absent du rapport** = jamais importé | — |

### 12.3 Logique métier critique sans couverture

1. `soumettreAvis` / `completerSoumission` — toute la surface d'écriture publique.
2. `rowLevelSecurity` : `assertAgenceAccess`, `buildAgenceFilter`, `resolveAgenceScope`, `requirePlatformRole`, et le cache 10 s de `assertEntrepriseActive`.
3. Toute la chaîne IA à l'exécution : `AIService` (ordre de repli), les 3 providers, `chatJson` (point de défaillance unique de toute sortie LLM).
4. Les 4 jobs : machine à états IA, idempotence et budget du job global, détection de silence, e-mails/SMS de relance.
5. `soumissions.ts` (moyenne par avis) et `validation.ts` (assainissement XSS, anti-injection CSV, E.164) — **0 %**.
6. `calculerAgregats` : seul le chemin CES est testé ; CSAT, NPS, thèmes, qualité, par-agence et par-service ne le sont pas — or ils alimentent toute la zone « Expérience client ».

---

## 13. Plan recommandé

```text
V1  correctifs ÉLEVÉ       P1 (code_public obligatoire) · P2 (sélecteurs + recalcul
                           canonique) · P3 (reaper PROCESSING) · P4 (retry GEX)
   │
   ├─ V2  agrégats        une seule implémentation /100, suppression des 4 copies
   │      legacy, P6 (libellés par optionId), P12 (objectifs sur la bonne query)
   │      └─ V3  expérience  correction des contrastes (variantes texte),
   │                      a11y page publique, bloc Data Quality, drill-down
   │
   ├─ V4  dette / données  deploy/ hors suivi git · modèle mort + SESSION_SECRET ·
   │                      §2.2 (index) · enums ou check applicatif strict ·
   │                      dup des 3 prompts · DATA_QUALITY_SCORE unique
   │
   └─ V5  tests / IA / UX  seuils de couverture sur RLS + actions publiques ·
                          tests de parcours (testing-library) · budget IA
                          (P9) · priorité LLM (P10) · surface publique (P11)
```

**Ordre imposé par les dépendances**

| Vague | Ne peut pas commencer avant | Pourquoi |
|---|---|---|
| V1 (P1) | rien | correctif de sécurité, 1 ligne, aucun risque |
| V1 (P2) | rien | mais **change les chiffres affichés** : c'est une correction, à annoncer comme telle |
| V2 | P2 | tant que les 4 copies legacy vivent, toute refonte les duplique |
| V3 | V2 | le dashboard ne doit consommer que l'agrégateur unique |
| V4 | aucune | indépendant, mais à ne pas entamer avant V2 (les index servent les nouveaux agrégats) |
| V5 | V1 | les tests de sécurité n'ont de sens qu'après le correctif de `code_public` |

**Hors périmètre, volontairement** : refonte du design system, nouvelle
stratégie de jobs, refonte du parcours multi-opérations, migration des `Canal`,
et tout ce qui est déjà conforme (écriture serveur du score, isolation, CSP,
idempotence, anti-injection, prompt-injection, accessibilité du dashboard
interne côté navigation).

---

## 14. Dépendances entre les futures vagues

```text
        ┌──────────────────────────┐
        │  V0 AUDIT (ce document)  │
        └────────────┬─────────────┘
                     │ toutes les vagues le citent
      ┌──────────────┼───────────────┬──────────────────┐
      ▼              ▼               ▼                  ▼
  V1 SÉCURITÉ   V2 AGRÉGATS     V4 DETTE/DONNÉES   V5 TESTS/IA/UX
  P1,P3,P4      P2,P6,P12        deploy/, index,    couverture, parcours,
  (indispens.)   (fondation)      prompts, enums     budget, surface
      │              │               │                  │
      └──────┬───────┘               │                  │
             ▼                       │                  │
        V3 EXPÉRIENCE ◄──────────────┘                  │
        contrastes, a11y,                                │
        Data Quality, drill-down                         │
             │                                          │
             └──────────────► certification finale ◄───┘
```

Trois dépendances sont **dures** et ne peuvent pas être contournées :

1. **V1-sécurité avant tout test de sécurité** : tester `soumettreAvis` avant de
   corriger P1 reviendrait à écrire un test qui valide une faille.
2. **V2 avant V3** : l'écran doit consommer l'agrégateur central, sinon on
   corrige l'affichage d'une donnée que l'agrégat produit encore de travers.
3. **V2 avant V4-index** : mesurer les index sur les requêtes finales, sinon on
   indexe des requêtes qui vont disparaître.

---

## 15. Ce que cet audit ne prouve pas

- Il ne prouve **aucune conformité** : « conforme à WCAG AA » n'a pas été
  audité avec un outil automatique, et un audit manuel couvre une part
  minoritaire des critères.
- Il ne prouve pas l'absence d'autres vulnérabilités : 12 opérations publiques
  sur 109 ont été analysées en détail, le reste est couvert par relecture des
  garde-fous, pas par test.
- Les chiffres de couverture sont mesurés sur les fichiers **importés par un
  test** ; les jobs absents du rapport ont une couverture réelle de 0 %.
- La base ne contient aucune donnée : tout ce qui concerne la migration de
  l'historique (`MIGRATED`, `LEGACY_POSITIONAL`) est **non validé en conditions
  réelles**.
- Les mesures de contraste sont calculées à partir des tokens de
  `src/shared/branding.ts` appliqués sur fond crème ; un rendu réel avec
  transparence empilée peut différer.

---

*Fin de la Vague 0. Aucun comportement métier n'a été modifié pour produire ce
document. Le commit associé ne touche que `docs/`.*
