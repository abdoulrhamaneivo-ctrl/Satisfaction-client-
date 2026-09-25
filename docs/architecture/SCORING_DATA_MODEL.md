# MODÈLE DE DONNÉES DU SCORING

> **Vague 1 de la campagne Hermes** — fondations persistantes du nouveau
> scoring. Ce document est la référence de la structure : qui porte quoi, ce qui
> estCalculé où, ce qui reste un héritage, et quelle règle garantit qu'une
> modification du scoring ne réinterprète jamais les réponses déjà collectées.
>
> - Dépôt : `~/Bureau/app` · Branche : `hermes/v1-data-model` · Base : `main`
> - Portée : **modèle et migration seulement**. La logique métier du scoring
>   vit dans `docs/architecture/SCORING_ENGINE.md` (Vague 2).
> - État vérifié le 2026-09-26 : 36 migrations appliquées, 0 échec, drift nul.

---

## 1. Invariants (à relire avant toute modification)

1. **L'ordre d'affichage n'est jamais une information de score.** Il vit dans
   `OptionCritere.ordre_affichage`, qui n'est lu que par l'interface.
2. **L'identité d'une option est stable** : `OptionCritere.id` (cuid). Un
   `libelle` peut être réécrit, l'id ne change pas — les réponses déjà
   collectées continuent de pointer sur la bonne option.
3. **Une option utilisée ne disparaît pas.** Retirer une option du jeu la passe
   `actif = false` ; la ligne et ses `ReponseOption` restent.
4. **Un score peut être absent, et c'est une information.** `NULL` signifie
   « non notable » (texte libre, choix catégoriel) et n'est jamais remplacé par
   0 ni par une moyenne.
5. **Le score officiel est écrit par le serveur**, jamais par le client, et
   **jamais par l'IA** (`score_source` n'a pas de membre IA).
6. **Une réponse ne peut pas être réinterprétée rétroactivement** : la version
   du scoring utilisée est stampée sur la ligne.

---

## 2. Vue d'ensemble des relations

```text
Entreprise ─┬─ Agence ─┬─ Guichet ─── AffectationGuichet ─ User
            │          └─ AgenceCritere ────────────────────┐
            ├─ Service ─── CritereService ─────────────────┤
            ├─ Critere ─┬─ OptionCritere ─┬─ ReponseOption ─┤
            │           │                 │                 │
            │           └─ Objectif       └─ Reponse ───────┘
            └─ GlobalExperienceAnalysis
```

Deux chemins de lecture coexistent volontairement :

- **Chemin de configuration** : `Critere` → `OptionCritere` (ce que l'admin
  définit).
- **Chemin de réponse** : `Reponse` → `ReponseOption` → `OptionCritere` (ce que
  le client a réellement choisi). C'est ce chemin qui fait foi pour le scoring.

`Reponse` porte en plus ses scores : le moteur lit l'option, calcule, et écrit
`score_officiel` + `score_normalise` + `score_source` + `critere_version`.

---

## 3. `OptionCritere` — l'option persistante

`schema.prisma:314-347` · table créée par `migrations/20260927000200_scoring_option_critere`

| Champ | Type | Règle |
|---|---|---|
| `id` | `String` `@id @default(cuid())` | **identité stable** d'une option métier. Ne dépend ni du libellé ni de la position |
| `id_critere` | `Int` → `Critere` `onDelete: Cascade` | Cascade **uniquement** parce qu'un critère supprimé n'a plus d'options ; une option, elle, n'est jamais supprimée |
| `libelle` | `String` | texte affiché au client, libre |
| `libelle_normalise` | `String` | minuscules, sans accents (fonction `normaliserLibelle`, identique au moteur) — sert de clé d'idempotence |
| `ordre_affichage` | `Int` `@default(0)` | **UX pure**. Aucun code de scoring ne le lit |
| `actif` | `Boolean` `@default(true)` | `false` = retirée du formulaire, historique conservé |
| `est_scorable` | `Boolean` `@default(true)` | `false` = option purement catégorielle (stats `%`, jamais de note) |
| `score` | `Int?` | score sémantique 1-10 ou `NULL` si non valencé. **C'est ce champ qui fait foi, jamais la position** |
| `score_provenance` | `String?` | `EXPLICIT` (saisi par l'admin) · `INFERRED` (inférence lexicale) · `MIGRATED` (backfill CSV→options) · `NULL` = non scoré. Ajouté par `20260927000300` |
| `poids` | `Int?` | `CASES_WEIGHTED` : `+` atout, `-` irritant (ex. `-25`). Borné ±100 côté action |
| `valeur_metier` | `String?` | valeur métier libre (code interne, référence externe) |
| `code_metier` | `String?` | code stable ; `EXCLUSIF` = convention « aucun problème » |
| `reponses` | `ReponseOption[]` | relation inverse |

Contraintes :

- `@@unique([id_critere, libelle_normalise])` — pas de doublon d'option dans un
  critère, insensible à la casse et aux accents.
- `@@index([id_critere, ordre_affichage])` — l'ordre d'affichage du formulaire
  est une lecture indexée.

---

## 4. `ReponseOption` — la réponse à choix multiples

`schema.prisma:358-367` · table créée par la même migration

| Champ | Type | Règle |
|---|---|---|
| `id_reponse` | `BigInt` → `Reponse` `onDelete: Cascade` | la réponse disparaît, ses choix disparaissent |
| `id_option` | `String` → `OptionCritere` **`onDelete: Restrict`** | **c'est la garde-fou centrale** : la base *refuse* physiquement la suppression d'une option déjà utilisée |
| — | `@@id([id_reponse, id_option])` | une option ne peut pas être cochée deux fois sur la même réponse |

Pourquoi une table de jonction plutôt que `Reponse.id_option` : un critère
`CASES` (choix multiples) doit pouvoir en sélectionner N, alors qu'un `QCM`
(choix unique) en sélectionne 1. La jonction couvre les deux sans cas particulier,
et supprime définitivement toute information de position.

---

## 5. `Reponse` — les cinq champs de score

`schema.prisma:426-478`, enrichis par `20260927000200` (structure) et
`20260927000400` (consolidation de l'historique).

| Champ | Type | Sens | Qui l'écrit |
|---|---|---|---|
| `score_brut` | `Int?` (nullable depuis `20260927000200`) | **LEGACY** — ancienne note métier 1-5/1-10, conservée comme trace | `actions.ts:778` (miroir de l'officiel) ; jamais réécrit par la consolidation |
| `score_officiel` | `Int?` | valeur métier brute du résolveur (note 1-5, valeur d'échelle, 0-10 NPS, `100+Σ poids` ramené /20) | moteur, via `construireLigne` |
| `score_normalise` | `Float?` | **canonique `/100`** — seule échelle comparable entre questionnaires | moteur |
| `score_source` | `String?` | `EXPLICIT` · `INFERRED` · `LEGACY_POSITIONAL` · `MIGRATED`. **Pas de source IA** | moteur |
| `critere_version` | `Int?` | version du scoring du critère **au moment de la réponse** | `actions.ts:782` |

Règle d'absence (invariants n°4) : un texte libre et un choix catégoriel
produisent `score_officiel = NULL` **et** `score_normalise = NULL`. La
consolidation historique applique la même règle aux anciennes lignes
(`20260927000400`, 3ᵉ `UPDATE` : QCM / CASES / TEXTE → `NULL`, avec
`score_source = 'LEGACY_POSITIONAL'` pour rester traçable). Aucune moyenne ne
doit compter ces lignes : c'est vérifié par le garde explicite de
`scoreNormaliseSur5` (`src/server/soumissions.ts:105`) et par le fait que
`AVG()` en SQL ignore les `NULL`.

---

## 6. `Critere` — la configuration du scoring

`schema.prisma:241-302`, enrichie par `20260927000200`.

| Champ | Rôle |
|---|---|
| `type_reponse` | `SMILEY` · `OUI_NON` · `QCM` · `CASES` · `ECHELLE` · `NPS` · `TEXTE` (String, voir §9) |
| `scoring_mode` | `String?` — `NULL` = déduit du type. Venu en Phase D : `CASES_CATEGORICAL`, `CASES_WEIGHTED`, `CES`… |
| `orientation` | `HIGHER_BETTER` par défaut, `LOWER_BETTER` pour les questions négatives et pour le CES (forcé) |
| `version` | **version du scoring** ; incrémentée à chaque modification de mode, d'échelle ou d'options (`actions.ts:2615`) |
| `options_reponse` | **LEGACY** — CSV des libellés |
| `scores_reponse` | **LEGACY** — CSV des scores, parallèle au précédent |

---

## 7. Héritage : `options_reponse` et `scores_reponse`

Ces deux colonnes sont **conservées mais rétrogradées**. Elles ne sont plus la
source de vérité du scoring ; elles servent de compatibilité de lecture et
d'affichage.

**Qui les écrit encore** (donc qui doit être surveillé) :

| Écriture | Emplacement | Pourquoi |
|---|---|---|
| `createCritere` | `actions.ts:2452` | reconstruit le CSV depuis les options soumises |
| `updateCritere` | `actions.ts:2663,2678` | idem |
| `duplicateCritere` | `actions.ts:2931` | copie `options_reponse` — **mais pas `scores_reponse`** (incohérence connue, Vague 2) |
| `synchroniserOptionsCritere` | `actions.ts:2286-2288` | renvoie `csvOptions` / `csvScores` à l'appelant qui les persiste |

**Qui les lit encore** : `scoringQCM.ts` (parseurs), l'écran d'édition des
options, l'export du libellé de réponse, et **trois affichages qui reconstruisent
un libellé depuis une position** — défaut connu et documenté dans
`docs/audit/ETAT_REEL_PROJET.md` (P6), à corriger en Vague 2.

**Règle de la vague** : ces colonnes ne sont lues par **aucun** code de
scoring. Toute nouvelle fonctionnalité doit lire `OptionCritere`. Leur retrait
définitif est possible quand ces trois lecteurs seront corrigés ; ce n'est pas
l'objet de la Vague 1, qui les **préserve**.

---

## 8. Stratégie de migration

### 8.1 La procédure appliquée

Cinq étapes, toutes réversibles ou additives.

```text
1. AUDIT           état de la base + dérive          → 36/36, drift nul
2. CONTRAINTES     ce qui existe déjà, ce qui manque  → aucune donnée existante modifiée
3. TRANSFORMATION  DDL additif, aucun DROP métier     → 20260927000200, 00300
4. CONSOLIDATION   backfill idempotent, une fois      → 00400 + 2 scripts
5. VÉRIFICATION    diff, relecture, tests             → migrate diff vide, 181/181
6. BASCULE         le code lit le nouveau modèle      → resolutionSoumission
```

### 8.2 Ce qui a été appliqué

| Étape | Artefact | Nature |
|---|---|---|
| 2 → 3 | `20260927000200_scoring_option_critere` | 3 colonnes sur `Critere`, 4 sur `Reponse`, `score_brut` rendu **nullable** (seule modification de contrainte : `DROP NOT NULL`, non destructif et sans réécriture), création de `OptionCritere` + `ReponseOption` + 3 index + 3 clés étrangères |
| 3 | `20260927000300_option_score_provenance` | 1 colonne `OptionCritere.score_provenance`, nullable |
| 4 | `20260927000400_backfill_scores_legacy` | 3 `UPDATE` idempotents (`score_source IS NULL` uniquement) |
| 4 | `scripts/backfillOptionsCriteres.ts` | crée les `OptionCritere` depuis les CSV, `score_provenance = MIGRATED`, déduplique par libellé normalisé |
| 4 | `scripts/backfillScoresReponse.ts` | remplit `scores_reponse` par inférence lexicale, laisse `NULL` les critères non valencés |
| 5 | — | `prisma migrate diff` : aucun delta applicatif ; 181 tests verts |

### 8.3 Règles de sécurité tenues

1. **Jamais de `DROP` sur une donnée métier.** Le seul `ALTER` non additif de
   cette vague est `DROP NOT NULL` sur `score_brut` — il *élargit* l'espace
   admissible, il ne détruit rien.
2. **Les tables d'authentification Wasp ne sont jamais touchées.** La migration
   `20260927000200` a été générée par `prisma migrate diff` puis **expurgée** de
   ses `DROP` sur `Auth` / `AuthIdentity` / `Session` (le commentaire est en
   tête du fichier). Une migration produite automatiquement par Wasp sur une
   base ayant ses tables d'auth **doit** passer par cette vérification manuelle.
3. **Consolidation idempotente** : tous les backfills filtrent sur l'état
   antérieur (`score_source IS NULL`, `options: { none: {} }`, `scores_reponse: null`).
   Relancer ne double rien.
4. **Vérification par l'outil, pas à l'œil** : `prisma migrate diff
   --from-url <base> --to-schema-datamodel schema.prisma --script`. Le résultat
   attendu est vide (hors tables Wasp) ; c'est le seul contrôle qui compte.
5. **Ne jamais faire confiance à un « ça a l'air appliqué »** : l'audit compare
   le nombre de dossiers de migration au nombre de lignes de
   `_prisma_migrations`, et contrôle `finished_at IS NULL`.

### 8.4 Point de vigilance documenté

Les migrations `20260927000000_drift_session_vote_totp` et
`20260927000100_session_rename_usersession` forment un **couple indissociable** :
la première modifie la table `Session` de Wasp, la seconde annule cette
modification et crée `UserSession`. Appliquées séparément, la première échoue sur
une base non vide (`ADD COLUMN "tokenHash" NOT NULL`) et, si elle passait, la
seconde doit réussir sinon **le login est cassé en production**. Le couple est
aujourd'hui entièrement appliqué ; il ne doit jamais être scindé lors d'un
`migrate reset` ou d'une reprise de migration.

---

## 9. Versionnage et immuabilité

### 9.1 Décision : `critere_version` porte la version du scoring

Le cahier distingue `critere_version` et `scoring_version`. **Décision retenue :
une seule version**, `Critere.version`, stampée sur la réponse dans
`Reponse.critere_version`.

| Considération | Analysis |
|---|---|
| Séparer les deux | Une seule règle de scoring est modifiable : type, mode, orientation, échelle, options et scores. Il n'existe aucune seconde règle qui évoluerait indépendamment |
| Coût d'une colonne en plus | Migration additive + backfill + un second point de désynchronisation possible, pour une information redondante |
| Traçabilité | `Reponse.critere_version` conserve l'**état effectif** du critère au moment de la réponse, y compris les règles qui n'ont pas de colonne propre (ordre des options, bornes d'échelle stockées dans `options_reponse`) |

Ce qui ferait revenir la décision : l'introduction d'une règle de scoring
*hors* du périmètre du critère (par exemple un barème dépendant du service ou de
l'agence), qui justifierait alors deux axes de version distincts.

### 9.2 Règles d'immuabilité historique

| # | Règle | Implémentation | Preuve |
|---|---|---|---|
| I1 | Modifier le scoring d'un critère **incrémente** `Critere.version` | `toucheScoring` couvre type, échelle, options, mode, orientation | `actions.ts:2632-2649` |
| I2 | Chaque réponse conserve la version utilisée | `critere_version` stampé à l'écriture | `actions.ts:782` |
| I3 | Un score n'est **jamais** recalculé après coup | aucun job ni script ne réécrit `score_officiel` / `score_normalise` ; la consolidation ne touche que `score_source IS NULL` | `migrations/20260927000400`, audit §7 |
| I4 | Retirer une option ne modifie pas l'historique | `actif = false` au lieu d'un `DELETE` ; `ReponseOption.id_option` est en `Restrict` | `actions.ts:2277-2280`, `schema.prisma:362` |
| I5 | Modifier un libellé ne casse rien | l'id ne change pas ; `ReponseOption` pointe sur l'id | `OptionCritere.id` cuid |
| I6 | Une réponse dont l'option n'est plus lisible est **ambiguë**, pas réinterprétée | le résolveur renvoie `AMBIGU(OPTION_INACTIVE)` et non un score deviné | `scoringEngine.ts:188,372` |

Conséquence opérationnelle : corriger un jeu d'options *change l'interprétation
des réponses futures* et **rien** aux réponses passées. Le préavis
« nouvelle version de scoring » affiché dans l'UI d'édition
(`ConfigurationCriteresPage.tsx`) est donc exact, pas décoratif.

---

## 10. Limites connues du modèle

Consignées ici pour que les vagues suivantes les traitent explicitement.

1. **Aucun `enum` en base** : `type_reponse`, `scoring_mode`, `orientation`,
   `status`, `statut_alerte`… sont des `String` libres. Une valeur invalide est
   acceptée par PostgreSQL ; seule la validation applicative la refuse.
2. **`critere_version` et `score_source` ne sont lus par personne** aujourd'hui
   (audit P14 b) : la traçabilité existe mais n'est pas exposée.
3. **`duplicateCritere` ne copie pas `scores_reponse`**, ce qui laisse le CSV
   incohérent pour la copie.
4. **Règle d'échelle double** : `OptionCritere.score` accepte 1-20 côté action
   alors que le parseur de CSV legacy refuse hors 1-5 — un score 6-20 produit un
   CSV que le parseur rejette en bloc.
5. **Aucune contrainte d'intégrité inter-entreprises** sur `CritereService` (un
   critère d'une entreprise peut être rattaché à une opération d'une autre) :
   la garantie est applicative, pas structurelle.

---

## 11. Critères de sortie de la vague

| # | Critère | État | Preuve |
|---|---|---|---|
| 1 | Les options ont des identifiants stables | ✅ | `OptionCritere.id` cuid, `@@unique([id_critere, libelle_normalise])` |
| 2 | CASES supporte les réponses multiples | ✅ | `ReponseOption` avec `@@id([id_reponse, id_option])` |
| 3 | Les scores peuvent être absents | ✅ | 4 champs nullable + `score_brut` rendu nullable ; consolidation à `NULL` pour texte/catégoriel |
| 4 | Les données historiques sont préservées | ✅ | aucune donnée modifiée par la migration ; `DROP NOT NULL` ≠ perte ; backfills idempotents |
| 5 | Le versionnage est défini | ✅ | §9 — `Critere.version` → `Reponse.critere_version`, 6 règles d'immuabilité |
| 6 | Migration et base vérifiées | ✅ | 36/36 appliquées, `migrate diff` vide hors tables Wasp |
| 7 | Documentation créée | ✅ | ce fichier |
| 8 | Logique métier du scoring non implémentée ici | ✅ | appartient à `SCORING_ENGINE.md` (Vague 2) |

---

*Vague 1. Cette livraison n'introduit aucune logique de scoring : elle établit
et documente les fondations persistantes. Le moteur est décrit dans
`docs/architecture/SCORING_ENGINE.md`.*
