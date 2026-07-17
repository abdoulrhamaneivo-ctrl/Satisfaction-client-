# Logique "1 avis = 1 soumission" — ce qui a été corrigé et pourquoi

Ce document explique en langage simple : (1) le bug qui existait, (2) ce qui a
été corrigé et comment, (3) comment créer des formulaires spécifiques par
guichet (ça fonctionnait déjà), et (4) comment tout ça se voit du côté du chef
d'entreprise (rôle DIRECTION).

## 1. Le bug : pourquoi un même avis se dédoublait

Quand un client répond à un formulaire, une ligne est créée en base **par
critère répondu** (table `Reponse`). Un formulaire à 3 questions crée donc 3
lignes. Chaque ligne porte un `id_soumission` (un identifiant commun), mais
avant cette correction :

- **Aucun écran** (page "Avis", tableau de bord) ne regroupait ces lignes.
  Résultat : un client qui répond à 3 questions apparaissait comme **3 avis
  différents**, avec le même commentaire répété 3 fois.
- **Toutes les statistiques** ("score de mesurage", moyenne mensuelle, KPI 30
  jours, classement des guichets, classement des agents) comptaient des
  **lignes** au lieu de **clients**. Un formulaire à 5 questions valait pour 5
  avis dans les compteurs, un formulaire à 1 question valait pour 1 seul.
  Deux agences avec le même nombre réel de clients pouvaient afficher des
  volumes très différents simplement parce que leurs formulaires n'avaient
  pas le même nombre de critères.

Ce n'était pas un problème d'affichage cosmétique : ça faussait tous les
indicateurs de pilotage, y compris ceux vus par la direction.

## 2. La correction mise en place

**Aucune migration de base de données n'a été nécessaire.** Le champ
`id_soumission` existait déjà sur chaque ligne `Reponse` et était déjà rempli
correctement par `soumettreAvis` — il suffisait de s'en servir partout où on
prétend compter des "avis".

### Nouveau module central : `src/server/soumissions.ts`

Un seul endroit définit maintenant ce qu'est "un avis" :

> Toutes les lignes `Reponse` qui partagent le même `id_soumission` forment
> **un seul avis**. Les lignes anciennes sans `id_soumission` (avant
> l'introduction du champ) restent chacune leur propre avis — on ne fusionne
> jamais des avis dont on n'est pas sûr qu'ils viennent du même envoi.

Il expose trois fonctions réutilisées partout côté serveur :
- `regrouperParSoumission(reponses)` → reconstruit la liste des avis avec
  leurs lignes de détail (une par critère).
- `compterAvis(reponses)` → nombre réel d'avis (pas de lignes).
- `scoreMoyenParAvis(reponses)` → pour chaque avis, la moyenne de ses propres
  critères (un avis à 5 critères pèse comme un avis à 1 critère dans une
  moyenne globale, pas 5 fois plus).

Un équivalent client (`regrouperAvisParSoumission` dans `src/client/utils.ts`)
fait la même chose côté navigateur pour les écrans qui reçoivent déjà des
lignes brutes.

### Ce qui a changé concrètement, écran par écran et calcul par calcul

| Endroit | Avant | Après |
|---|---|---|
| Page **Avis** (`AvisPage.tsx`) | 1 carte par ligne `Reponse` (doublons) | Nouvelle requête `getAvisGroupes` : 1 carte par avis, avec le détail des scores par critère affiché à l'intérieur de la carte |
| Score **"Mesurage"** du radar qualité (`getRadarStats`) | Comptait les lignes `Reponse` | Compte les avis réels (`compterAvis`) |
| Classement **par agent** / **par guichet** (`getStatsByAgent`, `getStatsByGuichet`) | `nb_avis` = nombre de lignes | `nb_avis` = nombre réel d'avis distincts |
| **Tendance mensuelle** (`getTendanceMensuelle`) | Comptait les lignes, moyenne par ligne | Compte les avis par mois, moyenne calculée par avis |
| **KPI 30 jours** (`getKPIsPeriode` — volume, note moyenne, % satisfaction) | Tout calculé par ligne | Tout calculé par avis (regroupement d'abord, puis moyenne/quantile sur les avis) |
| **Tableau de bord** — bandeau "Derniers avis" et rapport mensuel imprimable (`RapportMensuelPrint.tsx`) | Comptait les lignes | Comptent les avis regroupés |

Un seul indicateur est **volontairement laissé inchangé** : l'histogramme
"Répartition des notes (CSAT)" continue de compter chaque note de critère
individuellement (et non par avis). C'est un choix assumé : il répond à la
question "quelle est la distribution des notes données sur tous les
critères", différente de "combien de clients sont satisfaits". Si vous
préférez que cet histogramme soit lui aussi calculé par avis (ex. sur le score
moyen de chaque avis), c'est un changement simple à faire ensuite — dites-le
moi.

### Nouvelle requête : `getAvisGroupes`

Ajoutée dans `src/server/queries.ts` et enregistrée dans `main.wasp.ts`. Elle
prend exactement les mêmes filtres que l'ancienne `getReponses` (agence,
guichet, service, score, période), mais renvoie un objet par avis :

```ts
{
  id_soumission: string,
  date_reponse: Date,
  commentaire_texte: string | null,
  guichet, service, agence, agent,
  score_min: number,     // le pire critère de cet avis
  score_moyen: number,   // moyenne des critères de cet avis
  reponses: [{ id, score_brut, critere }, ...]  // détail par critère
}
```

Le filtre "score" (ex. "voir uniquement les avis notés 1 ou 2") s'applique
maintenant **après** le regroupement : un avis remonte s'il contient au moins
un critère avec cette note, pour ne pas perdre un client mécontent sur un
seul critère parmi cinq.

## 3. Formulaires spécifiques par guichet — déjà en place, rien à corriger

Bonne nouvelle : cette partie fonctionnait déjà correctement, aucune
modification n'a été nécessaire.

- La relation `Guichet ↔ Service` est many-to-many, et `Service ↔ Critere`
  aussi.
- `getFormDefinitionForGuichet(id_guichet)` construit le formulaire vu par le
  client en combinant : les critères des **services rattachés à ce guichet**
  + les critères **globaux de l'agence** (`AgenceCritere`).

**Pour créer un formulaire différent par guichet**, il suffit de gérer quels
services sont rattachés à chaque guichet dans votre back-office
(`updateGuichetServices`) :

- Guichet "Ouverture de compte" → rattachez le service *Ouverture de compte*
  → les clients de ce guichet ne verront que les critères liés à ce service
  (+ les critères globaux de l'agence, s'il y en a).
- Guichet "Retrait espèces" → rattachez un autre service → formulaire
  différent, automatiquement.

Aucune ligne de code à toucher pour ça : c'est une question de configuration
(quels services sont cochés pour quel guichet), pas de développement.

### Filtrer les avis par guichet — déjà en place aussi

`getAvisGroupes` (comme l'ancienne `getReponses`) accepte un paramètre
`id_guichet`. La page "Avis" a déjà un sélecteur "Guichet / Caisse" qui
l'utilise. Chaque guichet peut donc avoir son propre formulaire ET être
consulté séparément dans la liste des avis, sans rien ajouter.

## 4. Ce que ça change pour le chef d'entreprise (rôle DIRECTION)

Le système de portée par rôle existait déjà et n'a pas été modifié
(`src/server/middleware/rowLevelSecurity.ts`) :

- **DIRECTION / QUALITE** voient **toutes les agences de leur entreprise**
  (jamais celles d'une autre entreprise) — `buildAgenceFilter` renvoie un
  filtre sur toutes les agences du tenant.
- **CHEF_AGENCE / AGENT** ne voient que **leur propre agence**.

Comme la correction a été faite dans les fonctions de calcul elles-mêmes
(`getRadarStats`, `getStatsByAgent`, `getStatsByGuichet`, `getKPIsPeriode`,
`getTendanceMensuelle`, `getAvisGroupes`), **la même correction s'applique
automatiquement à la vue consolidée du chef d'entreprise** : quand une
DIRECTION regarde le tableau de bord sans filtrer sur une agence précise, les
totaux, moyennes et classements qu'elle voit portent maintenant sur le vrai
nombre de clients ayant donné un avis dans toute l'entreprise — plus sur le
nombre de lignes de formulaire.

Concrètement, pour le chef d'entreprise, ça veut dire :
- Le nombre d'avis affiché (KPI, rapport mensuel imprimable) reflète le vrai
  nombre de clients qui ont répondu, quelle que soit la longueur du
  formulaire utilisé dans chaque agence/guichet.
- Le classement des agences/guichets/agents n'avantage plus artificiellement
  ceux dont le formulaire a le plus de questions.
- Il peut toujours filtrer par agence (menu déroulant déjà existant sur la
  page Avis) pour descendre au détail d'une agence en particulier, avec les
  mêmes garanties de comptage correct.

## 5. Fichiers modifiés / ajoutés

- **Ajouté** `src/server/soumissions.ts` — logique de regroupement, source
  unique de vérité côté serveur.
- **Modifié** `src/server/queries.ts` — nouvelle requête `getAvisGroupes` ;
  correction de `getRadarStats`, `getStatsByAgent`, `getStatsByGuichet`,
  `getTendanceMensuelle`, `getKPIsPeriode`.
- **Modifié** `main.wasp.ts` — import + enregistrement de `getAvisGroupes`.
- **Modifié** `src/client/utils.ts` — ajout de `regrouperAvisParSoumission`
  (équivalent client du regroupement serveur).
- **Modifié** `src/client/pages/AvisPage.tsx` — utilise `getAvisGroupes`,
  affiche 1 carte par avis avec détail des critères.
- **Modifié** `src/client/pages/DashboardPage.tsx` — bandeau "Derniers avis"
  et son tableau comptent/affichent des avis regroupés, pas des lignes.
- **Modifié** `src/client/components/RapportMensuelPrint.tsx` — total, note
  moyenne et taux de satisfaction du rapport imprimable calculés par avis.
- **Non modifié** (déjà correct) : `getFormDefinitionForGuichet`, la relation
  Guichet↔Service↔Critere, et tout le système de portée par rôle
  (`rowLevelSecurity.ts`).

Aucune migration Prisma requise, aucune donnée existante à retraiter : le
regroupement se fait à la lecture, à partir de l'`id_soumission` déjà stocké
sur chaque ligne.
