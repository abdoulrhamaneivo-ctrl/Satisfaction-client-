# MOTEUR DE SCORING — Source unique de vérité

> **Vague 2 de la campagne Hermes.** Le serveur possède une seule règle de
> calcul, pure et testée. Le client ne propose jamais un score officiel, et
> l'IA n'en écrit jamais.
>
> - Implémentation : `src/shared/scoringEngine.ts` (moteur pur) +
>   `src/server/resolutionSoumission.ts` (application serveur)
> - Modèle de données : `docs/architecture/SCORING_DATA_MODEL.md`
> - État réel du projet : `docs/audit/ETAT_REEL_PROJET.md`

---

## 1. Principe d'autorité

```text
payload client          { critereId, optionId | optionIds[] | valeur | valeurOui | texte }
   ↓  ignored : tout score client
validation côté serveur
   ↓
critère relu en base     (type, scoring_mode, orientation, version, bornes)
   ↓
option(s) relue(s) par IDENTITÉ (OptionCritere.id)
   ↓
règle de scoring du moteur (fonction pure, aucun I/O)
   ↓
score_officiel + score_normalise + score_source + critere_version
   ↓
Reponse (transaction + verrou consultatif)
```

Trois interdits absolus, vérifiés par les tests :

| Interdit | État | Preuve |
|---|---|---|
| `score = index + 1` | absent du code d'exécution | seules occurrences : commentaires d'historique (`actions.ts:682,688`, `scoringQCM.ts:5`) |
| reconstruction d'un libellé depuis une position | éliminé en Vague 2 | `src/shared/libelleReponse.ts` ; test « même option métier + ordre différent = même libellé » |
| l'IA comme source de score | impossible | `score_source` n'a pas de membre IA ; les seuls sites d'écriture sont `actions.ts:778-782` et `resolutionSoumission.ts` |

---

## 2. Les neuf stratégies

| Stratégie | Type de critère | Entrée | Note officielle | `/100` |
|---|---|---|---|---|
| `SMILEY` | SMILEY | note entière 1-5 | `s` | `(s−1)×25` |
| `BINARY` | OUI_NON | booléen + `orientation` | `5` (positif) ou `1` | `100` ou `0` |
| `ORDINAL` | QCM | `optionId` | score sémantique de l'option | `(s−1)/(S−1)×100` avec `S = max(5, max des scores)` |
| `NUMERIC` | ECHELLE | valeur + bornes stockées | `v` | `(v−min)/(max−min)×100` |
| `CES` | ECHELLE (`scoring_mode=CES`) | valeur, échelle 1-5 ou 1-7 | `v` | **inversé** : `(max−v)/(max−1)×100` |
| `NPS` | NPS | entier 0-10 | `v` | `v×10` + catégorie |
| `CASES_CATEGORICAL` | CASES | `optionIds[]` | **`NULL`** | `NULL` |
| `CASES_WEIGHTED` | CASES | `optionIds[]` + poids | `arrondi(clamp/20)` borné 1-5 | `clamp(100 + Σ poids, 0, 100)` |
| `FREE_TEXT` | TEXTE | verbatim | **`NULL`** | `NULL` |

**Aucune échelle n'est codée en dur** : `NUMERIC` et `CES` lisent `min`/`max`
depuis la configuration stockée du critère. `CES` n'accepte que 1-5 et 1-7 —
toute autre échelle est **refusée** (`ECHELLE_CES_INVALIDE`) plutôt
qu'approximée.

---

## 3. Orientation

`orientation` appartient au **critère**, jamais au texte de la question.

| Orientation | Sens | Exemple |
|---|---|---|
| `HIGHER_BETTER` (défaut) | plus = mieux | « Êtes-vous satisfait ? » → Oui = positif |
| `LOWER_BETTER` | moins = mieux | « Avez-vous rencontré un problème ? » → Oui = **négatif** |

`LOWER_BETTER` est **imposée** par le moteur pour le CES : la convention de
mesure dit que 1 = très facile, donc l'orientation saisie par l'admin est
corrigée à l'écriture (`actions.ts`, garde CES) et de nouveau à la résolution.
Un administrateur ne peut pas inverser un CES.

Conséquence d'affichage corrigée en Vague 2 : la fiche d'un avis affichait
« Non » pour un « Oui » sur une question négative, parce qu'elle déduisait la
réponse du score seul. Elle lit désormais l'orientation
(`src/shared/libelleReponse.ts:libelleOuiNon`).

---

## 4. Normalisation canonique

```text
score_normalise ∈ [0, 100]   — seule échelle comparable entre questionnaires
```

```text
ratio = (valeur − min) / (max − min)
direct  = ratio × 100
inversé = 100 − direct        (LOWER_BETTER)
```

`score_officiel` reste dans l'unité métier (1-5, 0-10, 1-7, `/20` du pondéré) :
c'est lui qu'on affiche à l'utilisateur, jamais le `/100` brut.

---

## 5. NPS

Le NPS est une **métrique**, pas une moyenne : `agrerNPS()` ne fait jamais
`moyenne(note)`.

```text
0-6  détracteur · 7-8 passif · 9-10 promoteur
NPS = % promoteurs − % détracteurs   (entier, borné [−100, +100])
```

Volume nul → `nps: null` et des taux à 0, jamais un `0` présenté comme un NPS.

---

## 6. QCM et SMILEY : l'identité, jamais le rang

- **QCM** : l'entrée est un `optionId`. Le moteur lit l'option, vérifie qu'elle
  est active et scorable, puis renvoie **son** score. Option inconnue ou
  retirée → `AMBIGU(OPTION_INCONNUE | OPTION_INACTIVE)` : le formulaire a pu
  être modifié depuis l'affichage, et deviner serait faux.
- **SMILEY** : échelle fixe 1-5, donc aucune position à ballots — la
  validation stricte (entier 1-5) suffit à interdire tout biais d'ordre.
- **Test d'invariant obligatoire** : « même option métier + ordre d'affichage
  différent ⇒ même score ». C'est la propriété testée dans
  `scoringEngine.test.ts` (ordres normal, inversé, mélangé) et
  `libelleReponse.test.ts` (identité de l'option, ordre inversé).

---

## 7. CASES

### `CASES_CATEGORICAL`
Aucune note. Les options servent aux **distributions et pourcentages** : la
réponse expose `options_retenues` (les identités cochées) et rien d'autre.
C'est le mode qu'un admin choisit pour un « motifs de dissatisfaction ».

### `CASES_WEIGHTED`

```text
score_normalise = clamp(100 + Σ poids, 0, 100)
score_officiel  = arrondi(clampé / 20) borné à [1, 5]
poids ∈ [−100, +100]   (+ atout, − irritant)
```

Options **exclusives** : une option marquée `code_metier = EXCLUSIF` (ou un
libellé de la liste « aucun / aucune / rien / RAS… ») ne peut pas être
cochée avec une autre → `AMBIGU(EXCLUSIVITE_VIOLÉE)`. Sans cette règle, la
somme des poids d'un « Aucun problème » + d'un irritant n'aurait aucun sens.

Sélection vide → `AMBIGU(SELECTION_VIDE)` : rien n'est coché n'est pas « 0 ».

---

## 8. TEXTE

Un texte libre ne devient **jamais** une note. Il est stocké comme donnée
qualitative (`commentaire_texte`) et alimente l'analyse IA. La consolidation
historique applique la même règle aux anciennes lignes
(`20260927000400`, 3ᵉ `UPDATE`).

---

## 9. Provenance

| `score_source` | Origine |
|---|---|
| `EXPLICIT` | règle saisie par l'admin (score d'option, oui/non, échelle) |
| `INFERRED` | inférence lexicale du libellé, tracée et identifiée |
| `MIGRATED` | backfill CSV → options, ou reprise d'une ancienne soumission par libellé |
| `LEGACY_POSITIONAL` | ligne historique dont le score venait d'une position — conservée **telle quelle**, jamais réécrite |
| *(IA)* | **inexistant** par construction |

---

## 10. Ambiguïtés : jamais de score inventé

| Situation | Sortie | Pourquoi |
|---|---|---|
| option inconnue / inactive | `AMBIGU` | le formulaire a pu changer ; deviner serait faux |
| sélection vide (CASES) | `AMBIGU` | « rien de coché » ≠ 0 |
| exclusivité violée | `AMBIGU` | somme de poids sans sens |
| poids manquants | `AMBIGU` | configuration incomplète |
| hors bornes / non entier | `AMBIGU` | valeur invalide |
| échelle CES non supportée | `AMBIGU(ECHELLE_CES_INVALIDE)` | corriger la configuration, pas l'estimer |
| mode inconnu | `AMBIGU(MODE_INCONNU)` | pas de repli silencieux |
| texte / catégoriel | `NON_NOTABLE` | `null`, jamais 0 ni 3 |

Ces statut remontent jusqu'à la collecte, qui répond **400 actionnable** au
client plutôt que d'accepter une réponse inexploitable.

---

## 11. Ce qui a été nettoyé en Vague 2 (exigence §13)

| Retiré | Emplacement | Raison |
|---|---|---|
| `options[score_brut - 1]` (libellé QCM) | `queries.ts:432` (export), `client/utils.ts:59` (exports), `LigneReponse.tsx:80` (fiche avis) | pouvait nommer la **mauvaise** option ; remplacé par l'identité `ReponseOption` |
| `score_brut >= 4` (Oui/Non) | `LigneReponse.tsx:96` | ignorait l'orientation : « Non » affiché pour un « Oui » négatif |
| `${score_brut}/5` en recherche globale | `CommandPalette.tsx` | fausse note sur 5 pour un QCM, un NPS ou une échelle 1-10 |
| 4ᵉ copie de la normalisation `/5` | `LigneReponse.tsx:24-30` | sans branche `score_normalise` : le CES y était inversé |
| `resoudreScoreQCM`, `resoudreScoreCASES` | `scoringQCM.ts` | résolveurs *positionnels* d'avant la refonte, plus aucun appelant |
| `estCritereNote` | `scoringQCM.ts` | plus aucun appelant |
| `verifierEntrepriseActive` | `rowLevelSecurity.ts:406` | doublon non testé d'`assertEntrepriseActive`, et son commentaire affirmait un appel depuis `requireAuth` qui n'existe pas |
| `duplicateCritere` sans `scores_reponse` | `actions.ts` | copie incomplète : barème perdu, inférence lexique rejouée |

**Conservés volontairement** : `note5Vers100` (primitive publique testée du
moteur, sans concurrent), `resoudreCasesMoyenne` (chemin `MIGRATED` documenté
pour les CASES sans mode), `scoresEffectifsPourCritere` et
`construireScoresAStocker` (encore appelés par les backfills).

---

## 12. Couverture de tests

| Fichier | Tests | Objet |
|---|---|---|
| `scoringEngine.test.ts` | 46 | chaque stratégie, ordre libre des options, orientation inversée, bornes, CES, configs invalides |
| `resolutionSoumission.test.ts` | 18 | identité vs position, repli `MIGRATED`, option inconnue/inactive, erreurs actionnables |
| `libelleReponse.test.ts` | 19 | **identité de l'option, ordre inversé, option sans identité, Oui/Non selon orientation, CASES multi** |
| `ces.test.ts` | 16 | bandes, top box, monotonie, volume vide |
| `moteurGlobal.test.ts` | 13 | priorités déterministes, périodes, agrégat CES |

Point de couverture assumé : `calculerAgregats` n'est testé que sur sa branche
CES ; ses autres sorties (CSAT, NPS, thèmes, qualité) reposent encore sur la
relecture — c'est un reliquat de la campagne (audit §12.3).

---

## 13. Règle d'or à retenir

> Le score dépend de la **règle métier** et de l'**option réelle**, jamais de sa
> position dans une liste — et jamais d'une décision du client ni d'une
> interprétation de l'IA.
