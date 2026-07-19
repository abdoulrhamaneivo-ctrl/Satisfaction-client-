# Yeba — Comment fonctionne la plateforme

Ce document explique l'architecture métier de Yeba : qui peut faire quoi, comment les
données sont cloisonnées entre clients du SaaS, et comment un avis client se transforme
en KPI puis en action corrective. Il a été rédigé après un audit complet du code
(`src/server/actions.ts`, `src/server/queries.ts`, `src/server/middleware/rowLevelSecurity.ts`,
`schema.prisma`, `src/server/jobs/*`).

---

## 1. Hiérarchie des données

```
Entreprise (le client SaaS, ex. "Banque X")
 └─ Agence (une succursale, ex. "Agence Plateau")
     └─ Guichet (un point de service physique dans l'agence)
         └─ AffectationGuichet (quel Agent tient ce guichet, sur quel créneau)
         └─ Reponse (un avis client soumis sur ce guichet)
              └─ Alerte (générée automatiquement si note ≤ 2/5)
                   └─ TacheCorrective (action de suivi assignée à un responsable)
```

- **Entreprise** = le tenant. Une entreprise ne voit jamais les données d'une autre.
- **Agence** = une succursale. Une entreprise peut avoir plusieurs agences.
- **Guichet** = un poste physique (caisse, accueil...) au sein d'une agence. C'est
  l'unité qu'on scanne via QR code pour laisser un avis.
- **Critere** et **Service** peuvent être « socle » (fournis par la plateforme,
  `id_entreprise = null`, visibles par tous) ou propres à une entreprise
  (`id_entreprise` renseigné, invisibles aux autres entreprises).

---

## 2. Les rôles

| Rôle | Portée | Peut faire |
|---|---|---|
| **DIRECTION** | Toute l'entreprise (toutes ses agences) | Crée les agences ; nomme les **Chefs d'Agence** et les **Auditeurs Qualité** (uniquement) ; voit les KPI consolidés ; gère les critères, la tarification (si admin plateforme) |
| **QUALITE** | Toute l'entreprise | Comme DIRECTION sauf création d'agence, nomination de personnel et gestion structurelle des guichets |
| **CHEF_AGENCE** | Une seule agence (la sienne) | **Seul rôle habilité à créer les guichets de son agence** et à y configurer les opérations ; recrute ses **Agents de guichet** ; gère le planning et les critères actifs de son agence |
| **AGENT** | Aucune (pas de compte de connexion sauf cas particulier) | Référencé dans le planning ; ses avis reçus sont comptabilisés, mais il ne se connecte pas à l'application |

> **Règle de séparation des responsabilités (mise à jour) :** la Direction ne
> crée plus ni guichets ni agents. Elle structure le réseau (agences, chefs
> d'agence, auditeurs qualité) ; chaque Chef d'Agence est ensuite pleinement
> responsable de la mise en place opérationnelle de sa propre agence
> (guichets, opérations, agents). C'est appliqué à la fois côté serveur
> (`createGuichet`, `updateGuichetServices`, `inviteAgent`) et côté
> interface (le formulaire n'affiche plus que les rôles/actions autorisés
> selon qui est connecté).

Le rôle et le périmètre (`id_agence` / `id_entreprise`) sont stockés sur `User` et
vérifiés côté serveur à **chaque** action/query via `src/server/middleware/rowLevelSecurity.ts` —
jamais côté client seul. C'est le module central et unique de contrôle d'accès :
toute nouvelle action doit passer par ses helpers plutôt que réinventer une vérification.

### Les helpers clés (`rowLevelSecurity.ts`)
- `requireAuth` : faut être connecté (et pas suspendu).
- `requireRole(context, roles)` : faut avoir l'un des rôles autorisés.
- `buildAgenceFilter` : construit le bon filtre Prisma selon le rôle (une agence pour
  CHEF_AGENCE/AGENT, toutes les agences de l'entreprise pour DIRECTION/QUALITE).
- `assertAgenceAccess` : vérifie qu'une ressource ciblée (agence, guichet, agent...)
  appartient bien au périmètre de l'appelant — c'est ce qui empêche un CHEF_AGENCE
  d'agir sur une autre agence, ou une DIRECTION d'agir sur une autre entreprise.
- `resolveAgenceId` : détermine l'agence à utiliser pour une requête, en vérifiant
  systématiquement tout id fourni par le client (jamais fait confiance à un
  `id_agence` envoyé tel quel depuis le frontend).

---

## 3. Parcours utilisateur — Chef d'entreprise (DIRECTION)

1. **Inscription** → `/onboarding` → `completeOnboarding` crée l'`Entreprise` et une
   première `Agence` nommée automatiquement *"Siège <nom entreprise>"*. Le compte est
   promu au rôle `DIRECTION` et rattaché aux deux.
2. **Créer les autres agences du réseau** → `/admin/agences` → `createAgence`.
3. **Rattacher un Chef d'Agence à chaque agence** → `/admin/personnel` (sélectionner
   l'agence dans le menu déroulant) → `inviteAgent(role: 'CHEF_AGENCE')`. Un email
   avec identifiants temporaires lui est envoyé. Règle : **un seul Chef d'Agence actif
   par agence**. La Direction peut aussi nommer un **Auditeur Qualité**
   (`role: 'QUALITE'`) — mais **plus d'Agent** : c'est désormais uniquement le rôle du
   Chef d'Agence.
4. **Suivre les KPI** → `/dashboard` : radar de conformité (5 axes — voir section 5),
   tendance mensuelle, comparaison par agent, alertes actives — tout est agrégé sur
   *toutes les agences de l'entreprise* via `buildAgenceFilter`.
5. **Traiter les alertes et tâches correctives** → `/alertes-taches`.

À partir de là, la Direction **ne crée plus rien d'opérationnel** (ni guichet, ni
agent, ni opération) — cette responsabilité appartient entièrement à chaque Chef
d'Agence (étape suivante).

## 4. Parcours utilisateur — Chef d'Agence

Une fois invité par la Direction, le Chef d'Agence prend en main la mise en place
complète de **sa propre agence uniquement** (`assertAgenceAccess` refuse toute
tentative d'accès à une autre agence, y compris en trafiquant les paramètres de
requête côté client) :

1. **Crée les guichets de son agence** → `/guichets` → `createGuichet` (réservé au
   Chef d'Agence désormais).
2. **Définit les opérations (« Services »)** que gère chaque guichet — voir section 6
   pour ce que ça représente concrètement.
3. **Recrute ses Agents de guichet** → `/admin/personnel` → `inviteAgent(role: 'AGENT')`
   — seul rôle qu'un Chef d'Agence peut créer.
4. **Planifie** quel agent tient quel guichet, à quelle heure → `/planning` →
   `assignAgent`.
5. **Configure les critères actifs** de son agence, et **traite les alertes et tâches
   correctives** de son agence.

## 5. Parcours utilisateur — Client final (anonyme, sans compte)

1. Scanne le QR code d'un guichet → arrive sur `/q/:guichetId` (`CollectePage`).
2. `getFormDefinitionForGuichet` (query **publique**, volontairement sans auth) renvoie
   les services et critères actifs pour ce guichet.
3. Répond aux questions (smileys 1 à 5), laisse un commentaire et optionnellement son
   téléphone → `soumettreAvis`.
4. Côté serveur, `soumettreAvis` :
   - Vérifie l'**anti-rejeu** : un même numéro de téléphone (haché en SHA-256, jamais
     stocké en clair) ne peut soumettre qu'un avis par 24h (`VoteAntiRejeu`).
   - Enregistre une `Reponse` par critère répondu.
   - Si la pire note est ≤ 2/5, crée une `Alerte` de type `NOTE_CRITIQUE` et notifie
     (WhatsApp puis repli SMS) un responsable de l'agence (`CHEF_AGENCE`, `DIRECTION`
     ou `QUALITE` actif).

## 6. Les « Opérations » (modèle `Service`) et le formulaire dynamique

Ce que l'interface appelle une **Opération** (ex. « Retrait d'argent », « Envoi de
colis ») correspond au modèle de données `Service`. C'est ce qui pilote le
**questionnaire dynamique** vu par le client :

1. Sur `/q/:guichetId`, si le guichet gère plusieurs opérations, le client choisit
   d'abord **laquelle** il vient de faire (`SERVICE_SELECT`).
2. Selon l'opération choisie, `CollectePage` n'affiche que les critères **rattachés à
   cette opération précise** (`selectedService.criteres`, via la relation many-to-many
   `Service ↔ Critere`).
3. Si le guichet n'a aucune opération configurée (ou si un critère n'est rattaché à
   aucune opération), c'est le jeu de critères par défaut de l'**agence** qui
   s'applique (`agencyCriteres`, via `AgenceCritere`).
4. En dernier recours (aucune opération, aucun critère d'agence configuré), une
   question générique « Satisfaction globale » est utilisée pour ne jamais bloquer la
   collecte.

Ce mécanisme existait déjà dans le code (`CollectePage.tsx` /
`getFormDefinitionForGuichet`) — **c'est exactement le comportement que vous décrivez**
(« la première question demande l'opération, puis une autre liste de questions vient
en fonction de ça »). Ce qui manquait, c'est la possibilité de **créer des opérations
et de les rattacher à des critères depuis l'interface** plutôt que par un seed :

- Nouvelle action `createService` (rôle DIRECTION/QUALITE/CHEF_AGENCE) : crée une
  opération, disponible immédiatement dans la liste « Opérations gérées par ce
  guichet » (page Guichets) et dans le formulaire de critère (page Critères).
- `createCritere` accepte désormais un `serviceIds: number[]` optionnel : cochez une
  ou plusieurs opérations au moment de créer un critère pour qu'il n'apparaisse que
  quand le client choisit cette opération, plutôt que dans le socle par défaut de
  l'agence.

## 7. Pas de seed : comment peupler les données vous-même

Le script `dbSeeds.ts` créait automatiquement 3 critères socles (norme FD X50-167) et
3 opérations socles au premier démarrage. Si vous ne voulez pas l'utiliser, voici
l'équivalent manuel, dans l'ordre, une fois connecté :

1. **Onboarding** (`/onboarding`) : crée votre Entreprise + l'agence "Siège".
   Automatique, pas de saisie manuelle possible à sauter.
2. **Créer vos agences** (`/admin/agences`, DIRECTION) : une par succursale réelle.
3. **Inviter un Chef d'Agence par agence** (`/admin/personnel`, DIRECTION).
4. **Se connecter en tant que Chef d'Agence**, puis pour son agence :
   - **Créer les opérations** (« Opérations gérées par ce guichet » sur `/guichets`,
     ou directement sur `/criteres` — les deux écrans partagent le même
     `createService`). Ex : "Retrait d'argent", "Dépôt", "Renseignement".
   - **Créer les guichets** et cocher les opérations qu'ils gèrent.
   - **Créer les critères** (`/criteres`) et, pour chacun, cocher à quelle(s)
     opération(s) il se rattache (laisser vide = critère par défaut de l'agence).
   - **Recruter les agents** (`/admin/personnel`).
   - **Planifier** qui tient quel guichet (`/planning`).
5. Une fois ces étapes faites pour au moins une agence, le QR code d'un guichet
   (`/guichets` → « Télécharger ») devient utilisable pour de vrais tests de collecte.

Aucune de ces étapes ne dépend du script de seed — tout est désormais faisable
entièrement depuis l'interface.

## 8. Le radar de conformité (dashboard, 5 axes)

`getRadarStats` calcule un score 0-100 sur 5 dimensions pour une agence donnée :

| Axe | Calcul |
|---|---|
| **Planification** | % de guichets actifs ayant au moins un agent planifié aujourd'hui |
| **Mesurage** | Volume d'avis collectés vs objectif (15 avis / guichet actif) |
| **Surveillance** | % d'alertes qui ne sont plus au statut `NOUVELLE` (donc vues/traitées) |
| **Communication** | Diversité des canaux de collecte utilisés (QR/USSD/IVR) sur 3 |
| **Amélioration** | % de tâches correctives `TERMINEE` sur le total |

## 9. Automatisations (cron jobs)

| Job | Fréquence | Rôle |
|---|---|---|
| `detecterAlertesSilence` | Toutes les 30 min | Si un guichet planifié n'a reçu aucun avis depuis 2h pendant ses heures d'ouverture → crée une `Alerte SILENCE_EVALUATION` + SMS/WhatsApp au chef d'agence |
| `relancerTachesEnRetard` | Tous les jours à 08h00 | Relance par email le responsable d'une tâche corrective `A_FAIRE`/`EN_COURS` sans mise à jour depuis 48h |
| `envoyerRapportsMensuels` | Le 1er de chaque mois à 07h00 | Envoie un rapport de satisfaction du mois précédent à chaque chef d'agence (données de son agence) et à la direction (toutes agences consolidées) |

---

## 10. Correctifs appliqués récemment

| Bug | Cause | Correctif |
|---|---|---|
| `PlanningPage` : "Tous les champs de planification sont requis" alors qu'un agent est bien sélectionné | `id_agent` était converti avec `Number(agentId)` côté client alors que `User.id` est une **String** → `NaN` → `!NaN` vaut `true` côté validation serveur | Retrait du `Number()`, `id_agent` transmis tel quel |
| Erreur 500 sur `soumettre-avis` | `VoteAntiRejeu.hachage_tel` a une contrainte `@unique` globale, mais le contrôle anti-rejeu ne regardait que les 24 dernières heures ; réutiliser un numéro après 24h provoquait une violation de contrainte unique côté Prisma, non interceptée | `VoteAntiRejeu.create` remplacé par un `upsert` qui rafraîchit la date au lieu de planter |
| Impossible de créer une agence | La fonctionnalité n'existait simplement pas : `Agence.create` n'était appelé que dans `completeOnboarding` (agence "Siège" unique) | Nouvelle action `createAgence` (rôle `DIRECTION`) + nouvelle page `/admin/agences` |
| Erreur 500 sur `soumettre-avis` (cas 2, indépendant du précédent) | `id_canal` fait référence à `Canal.id`, mais **aucun code ne crée jamais de ligne `Canal`** — le frontend envoie pourtant toujours `canalId: 1`. Sans insertion manuelle en base, violation de clé étrangère systématique | `soumettreAvis` fait désormais un `upsert` sur `Canal` (crée le canal QR_WEB/USSD/IVR à la volée s'il n'existe pas) avant de créer la `Reponse` |
| Bouton "Télécharger" du QR Code ne fait rien | `toPng()` (html-to-image) échouait silencieusement : aucune erreur n'était affichée à l'utilisateur (seulement `console.error`), et le bouton restait cliquable même quand le QR n'avait pas pu être pré-chargé (`qrDataUrl` vide) | Ajout d'un toast d'erreur visible, garde-fou si le QR n'est pas chargé, et attente d'une frame de rendu avant capture |
| Impossible de créer une "opération" (aucune côté seed) | Aucune action `createService` n'existait — seul le script de seed créait des `Service`. Sans seed, "Aucune opération disponible" et aucun moyen d'en ajouter | Nouvelle action `createService` + mini-formulaire d'ajout inline sur `/guichets` et `/criteres` |
| Un critère créé à la main n'apparaissait jamais dans la liste dynamique par opération | `createCritere` ne permettait pas de le rattacher à un `Service` — il finissait toujours dans le seul fallback "critères de l'agence" | `createCritere` accepte désormais un `serviceIds` optionnel, avec un sélecteur dans le formulaire de création |
| La Direction pouvait créer des guichets et des agents, en contradiction avec la répartition des rôles voulue | `createGuichet`, `updateGuichetServices` et `inviteAgent` acceptaient `DIRECTION` sans distinction de rôle destinataire | Restreint : `createGuichet`/`updateGuichetServices` → `CHEF_AGENCE` uniquement ; `inviteAgent` → la Direction ne peut nommer que `CHEF_AGENCE`/`QUALITE`, le Chef d'Agence ne peut inviter que des `AGENT`. Appliqué côté serveur ET dans les formulaires |

---

## 11. Points de vigilance identifiés (non bloquants, à surveiller)

Ces points ne cassent rien aujourd'hui mais valent la peine d'être suivis :

1. **`getStatsByAgent`** fait une requête `Reponse.findMany` par agent dans une boucle
   (`Promise.all`) plutôt qu'une seule requête agrégée (`groupBy`). Fonctionnel, mais
   pourrait devenir lent si une agence a beaucoup d'agents actifs — à optimiser en
   `Prisma groupBy` si les temps de chargement du dashboard deviennent sensibles.
2. **`User.role` et `User.actif`** sont typés `String?`/`Boolean` sans contrainte
   d'énumération en base (validées seulement dans le code applicatif via
   `ROLES_INVITABLES`, `STATUTS_VALIDES`, etc.). Un accès direct à la base
   (script, seed mal écrit) pourrait insérer une valeur de rôle invalide sans que
   Prisma ne s'y oppose.
3. **Emails d'invitation** (`inviteAgent`) : le mot de passe temporaire est généré
   côté serveur et envoyé par email en clair au destinataire — assurez-vous que
   `SENDGRID_API_KEY` (ou le provider email configuré) est bien une clé **valide et
   non compromise** avant la mise en production (voir note de sécurité plus bas).
4. **`createAgence`** (nouveau) n'a pas de limite sur le nombre d'agences par
   entreprise — cohérent avec le reste du modèle SaaS actuel (pas de logique de plan
   payant qui limiterait le nombre d'agences), mais à revisiter si la tarification
   doit un jour dépendre du nombre d'agences plutôt que d'un abonnement fixe.

## 12. Rappel sécurité

La clé SendGrid partagée en clair dans les échanges de debug précédents doit être
**révoquée et régénérée** sur https://app.sendgrid.com/settings/api_keys avant toute
mise en production, si ce n'est pas déjà fait.
