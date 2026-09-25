# SCORING — Architecture du moteur de mesure (§72)

> Document de référence : types de réponses, modes de scoring, formules,
> normalisation, ambiguïtés, rétrocompatibilité, IA, confiance, indicateurs.
> Principe : le système répond toujours à « d'où vient cette valeur ? ».

## 1. Couches (ne jamais mélanger)

```text
RÉPONSE CLIENT → VALEUR MÉTIER → SCORING DÉTERMINISTE → ANALYSE IA
→ AGRÉGATION → INDICATEURS → CONCLUSION EXPLICABLE
```

| Couche | Rôle | Code |
|---|---|---|
| ScoreEngine | « combien ? » déterministe | `src/shared/scoringEngine.ts` |
| InsightEngine | « que se passe-t-il ? » (agrégats + priorités) | `src/server/gex/moteurGlobal.ts` |
| GlobalExperienceEngine | « situation et pourquoi ? » (LLM) | job `analyseGlobale.ts` |

Règles verrouillées : index d'affichage = UX seule · `optionId` = identité ·
score officiel = serveur déterministe · IA = interprète sans modifier.

## 2. Types de réponses → modes de scoring

| Type | Mode | Entrée client | Note officielle |
|---|---|---|---|
| SMILEY | SMILEY | score 1-5 (échelle fixe) | score, /100 = (s−1)×25 |
| OUI_NON | BINARY | booléen (+orientation) | 5/100 ou 1/0 |
| QCM | ORDINAL | optionId | score sémantique de l'option |
| TEXTE | FREE_TEXT | verbatim | **NULL (jamais noté)** |
| CASES | CATEGORICAL / WEIGHTED | optionIds[] | NULL, ou 100+Σ clampé |
| ECHELLE | NUMERIC (ou **CES** → §3 bis) | valeur (min/max validés) | valeur, ratio → /100 |
| NPS | NPS | valeur 0-10 | valeur, /100 = v×10, catégorie |

## 3. Formules

- **Ordinal** : échelle S = max(5, max scores) ; /100 = (s−1)/(S−1)×100.
- **Numérique** : ratio = (v−min)/(max−min) ; /100 = ratio×100 (ou 100−… si LOWER_BETTER).
- **NPS** : 0-6 détracteur, 7-8 passif, 9-10 promoteur ; **NPS = %prom − %detr** (jamais une moyenne).
- **CASES pondéré** : 100 + Σ(poids), clampé 0-100 ; officiel = arrondi(/20).
- **Indice global** : CSAT seul par défaut ; 60 % CSAT + 40 % NPS normalisé si dispo (`indiceGlobalExperience()`).

## 3 bis. CES — effort perçu (`src/shared/ces.ts`)

| Élément | Règle |
|---|---|
| Activation | `Critere.scoring_mode = 'CES'` sur un type `ECHELLE` |
| Échelles | 1-5 ou 1-7 uniquement (autre échelle → refus admin + `AMBIGU`) |
| Sens | 1 = **très facile** ; `orientation` forcée `LOWER_BETTER` (l'admin ne peut pas l'inverser) |
| Score canonique | /100 = (échelle − note)/(échelle − 1)×100 (effort 1 → 100) |
| Bandes 1-5 | 1-2 faible · 3 moyen · 4-5 élevé |
| Bandes 1-7 | 1-3 faible · 4-5 moyen · 6-7 élevé |
| Top box | meilleur tiers bas : 1-2 (1-5) / 1-3 (1-7) |
| Dénominateur | `n(CES)` uniquement — jamais `n(global)`, jamais de question CES → métriques N/A |
| Benchmarks externes | **aucun** embarqué : seuils = convention de mesure, pas une référence marché |

## 4. Ambiguïtés : jamais de score inventé

Option inconnue/inactive, sélection vide, exclusivité violée (« Aucun » + autres),
hors bornes, poids manquants, mode inconnu → statut **AMBIGU** → 400 actionnable
côté collecte. Non notable (TEXTE, catégoriel) → **NULL**, jamais 0 ni 3.

## 5. Identité et versionning

- `OptionCritere.id` (cuid) = identité ; `ordre_affichage` = présentation.
- Unicité sur `libelle_normalise` (minuscules, sans accents).
- Jamais de DELETE physique d'une option utilisée : `actif=false`.
- `Critere.version`++ à chaque changement de scoring ; stampé sur
  `Reponse.critere_version`. `score_source` : EXPLICIT | INFERRED |
  LEGACY_POSITIONAL | MIGRATED — **pas de source IA**.

## 6. Rétrocompatibilité

- `score_brut` conservé (lecture seule), `options_reponse`/`scores_reponse`
  CSV maintenus en écriture pour les lecteurs legacy.
- Consolidation `20260927000400` : SMILEY/OUI_NON/ECHELLE recalculés en
  `score_normalise` ; QCM/CASES/TEXTE → NULL + `LEGACY_POSITIONAL`.
- Les anciennes lignes ne sont jamais réécrites (bloqué par conception).

## 7. IA (§23-24, §43)

- Individuelle : sentiment, sévérité, thèmes/sous-thèmes, problèmes,
  urgence, cohérence (serveur tranche), émotion, action, **confidence** ;
  `prompt_version` + modèle/provider stockés ; job async, budget/jour,
  jamais bloquant (PENDING si down).
- L'IA ne crée **aucune** note officielle, ne modifie aucun score,
  n'invente aucune donnée (sinon « non disponible »).
- Globale : `GlobalExperienceAnalysis` (snapshot + indicateurs + synthèse
  + confiance + limites), job hebdo, seuil 10 avis, budget 5/jour.

## 8. Confiance et qualité

- Confiance globale : volume (≥50/≥15) + qualité (≥70/≥40) − pénalité
  incohérence > 25 % → ELEVEE/MOYENNE/FAIBLE.
- `DATA_QUALITY_SCORE` : 35 % notables + 20 % commentées + 20 % cohérence
  + 15 % fraîcheur (legacy plein, inféré moitié) + 10 % volume (saturé à 50).
- Taux de réponse : N/A sans dénominateur, jamais 0 %.

## 9. Indicateurs (catalogue `src/shared/indicateurs.ts`)

CSAT, médiane, /100, bandes (80/60/40/20), NPS + composantes, CES (N/A si
absent), volumes, complétion, cohérence %, sentiments, confiance IA moyenne,
qualité. Chaque KPI affiche définition + formule + source + période.

## 10. Fichiers

```text
src/shared/scoringEngine.ts     moteur pur (8 stratégies)
src/shared/scoringQCM.ts        lexique FR + CSV (compat)
src/shared/indicateurs.ts       catalogue + formules + qualité
src/server/resolutionSoumission.ts  résolution par réponse (400)
src/server/actions.ts           soumettreAvis, completerSoumission, CRUD critères
src/server/queries.ts           getObjectifsParAgence (avg normalisé), getIndicateursExperience
src/server/soumissions.ts       agrégation par avis (stocké prioritaire)
src/server/gex/moteurGlobal.ts  agrégats + priorités + prompt déterministe
src/server/jobs/analyseGlobale.ts  hebdo/mensuel, idempotent
src/server/globalExperience.ts  lecture + déclenchement DIRECTION
src/server/ai/                  providers + prompts v2 + synthèse globale
src/client/pages/CollectePage.tsx  T1 auto + T2 autosave + reset borne
```
