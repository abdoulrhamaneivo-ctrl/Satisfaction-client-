# CAHIER DES CHARGES FONCTIONNEL

# YEBA — PLATEFORME DE PILOTAGE DE LA SATISFACTION CLIENT

> SOURCE MÉTIER OFFICIELLE — fournie par Ivo (2026-08-29). Document conservé tel quel.
> Toute spec de `docs/frontend/` trace ses règles vers les § de ce document.

---

## 1. PRÉSENTATION DU PROJET

Yeba est une plateforme numérique destinée à permettre aux entreprises de collecter, centraliser, analyser et exploiter les retours de leurs clients afin d'améliorer continuellement la qualité de leurs services.

La plateforme est conçue pour les organisations disposant de plusieurs agences, guichets, points de service ou équipes en contact avec les clients.

Yeba permet de suivre l'expérience client depuis la collecte de l'avis jusqu'à la mise en œuvre et au suivi des actions correctives.

---

# 2. PROBLÉMATIQUE

Les entreprises peuvent rencontrer plusieurs difficultés dans le suivi de la satisfaction client :

* difficulté à collecter régulièrement les avis ;
* dispersion des informations ;
* manque de visibilité sur la satisfaction réelle des clients ;
* difficulté à comparer les agences ;
* difficulté à identifier les guichets ou services problématiques ;
* absence de suivi structuré des réclamations et insatisfactions ;
* difficulté à transformer les avis en actions concrètes ;
* production manuelle de rapports ;
* manque de suivi des actions correctives.

Yeba répond à ces problématiques en centralisant l'ensemble du processus.

---

# 3. OBJECTIF GÉNÉRAL

L'objectif de Yeba est de fournir à l'entreprise un outil permettant de :

> **Collecter → Mesurer → Analyser → Détecter → Agir → Suivre → Améliorer**

La plateforme ne doit donc pas être considérée comme un simple outil de sondage.

Elle doit constituer un véritable système de pilotage de la qualité et de l'expérience client.

---

# 4. OBJECTIFS SPÉCIFIQUES

Yeba doit permettre de :

* gérer l'organisation de l'entreprise ;
* gérer les agences ;
* gérer les guichets ;
* gérer les collaborateurs ;
* gérer les opérations ;
* définir les critères d'évaluation ;
* construire des questionnaires adaptés aux services ;
* collecter les avis clients ;
* analyser les résultats ;
* comparer les performances ;
* détecter les situations anormales ;
* générer des alertes ;
* créer des actions correctives ;
* suivre les actions ;
* analyser les commentaires clients ;
* produire des rapports ;
* conserver l'historique ;
* faciliter la prise de décision.

---

# 5. UTILISATEURS DE LA PLATEFORME

## 5.1. Direction

La Direction dispose d'une vision globale de l'entreprise.

Elle peut notamment :

* consulter les indicateurs globaux ;
* comparer les agences ;
* consulter les avis ;
* analyser les tendances ;
* consulter les alertes ;
* suivre les actions correctives ;
* consulter les rapports ;
* gérer les agences ;
* gérer les responsables selon ses autorisations.

## 5.2. Chef d'agence

Le Chef d'Agence gère les activités liées à son agence.

Il peut :

* consulter le tableau de bord de son agence ;
* gérer les guichets ;
* gérer les agents ;
* gérer les opérations ;
* configurer les critères ;
* affecter les agents ;
* gérer le planning ;
* consulter les avis ;
* consulter les statistiques ;
* traiter les alertes ;
* créer des actions correctives ;
* suivre les actions en cours.

Il ne doit pas pouvoir accéder aux informations d'une agence à laquelle il n'est pas rattaché.

## 5.3. Responsable qualité

Le Responsable Qualité dispose d'une vision orientée vers l'analyse et l'amélioration de la qualité.

Il peut :

* consulter les indicateurs ;
* analyser les avis ;
* analyser les commentaires ;
* suivre les tendances ;
* consulter les alertes ;
* suivre les actions correctives ;
* comparer les performances ;
* produire ou consulter les rapports.

## 5.4. Agent

L'agent est un collaborateur affecté à un ou plusieurs guichets.

Selon ses autorisations, il peut :

* consulter son planning ;
* consulter son affectation ;
* consulter certaines informations liées à son activité ;
* prendre connaissance des actions qui lui sont attribuées.

## 5.5. Client

Le client est l'utilisateur final du système de collecte.

Il ne doit pas nécessairement créer de compte.

Il peut :

1. accéder au questionnaire ;
2. sélectionner l'opération effectuée ;
3. évaluer les critères ;
4. ajouter un commentaire ;
5. envoyer son avis ;
6. recevoir une confirmation.

Le parcours doit être extrêmement simple et rapide.

---

# 6. ORGANISATION DE L'ENTREPRISE

Yeba repose sur une organisation hiérarchique :

**Entreprise**

→ **Agences**

→ **Guichets**

→ **Agents**

→ **Opérations**

→ **Critères**

→ **Avis clients**

Cette organisation permet de rattacher chaque avis à son contexte.

Exemple :

> Agence Cocody
> → Guichet 03
> → Opération : Retrait
> → Critère : Temps d'attente
> → Avis client

---

# 7. GESTION DES AGENCES

Les utilisateurs autorisés peuvent :

* créer une agence ;
* modifier une agence ;
* consulter une agence ;
* désactiver une agence ;
* archiver une agence ;
* restaurer une agence.

Informations principales :

* nom ;
* localisation ;
* adresse ;
* responsable ;
* statut.

Une agence désactivée ou archivée ne doit pas entraîner la suppression de son historique.

---

# 8. GESTION DES GUICHETS

Chaque agence peut posséder plusieurs guichets.

Un guichet peut être :

* créé ;
* modifié ;
* activé ;
* désactivé ;
* archivé ;
* restauré.

Un guichet peut être associé à :

* des agents ;
* des opérations ;
* un planning ;
* un dispositif de collecte.

---

# 9. GESTION DES AGENTS

La plateforme permet de gérer les collaborateurs.

Informations possibles :

* nom ;
* prénom ;
* email ;
* téléphone ;
* rôle ;
* agence ;
* statut.

Les responsables autorisés peuvent :

* ajouter un collaborateur ;
* inviter un collaborateur ;
* modifier ses informations ;
* modifier ses affectations ;
* suspendre son accès ;
* réactiver son accès.

---

# 10. GESTION DES OPÉRATIONS

Une opération correspond au service effectué par le client.

Exemples :

* retrait ;
* dépôt ;
* paiement ;
* renseignement ;
* ouverture de compte ;
* réclamation ;
* transfert ;
* autre service.

Chaque opération peut être associée à plusieurs critères.

---

# 11. GESTION DES CRITÈRES

Les critères correspondent aux éléments sur lesquels le client donne son appréciation.

Exemples :

* accueil ;
* rapidité ;
* temps d'attente ;
* disponibilité ;
* qualité des informations ;
* professionnalisme ;
* satisfaction globale.

Les critères peuvent être :

* créés ;
* modifiés ;
* activés ;
* désactivés ;
* archivés ;
* associés à des opérations.

---

# 12. QUESTIONNAIRES DYNAMIQUES

Le questionnaire doit être adapté au service utilisé.

Le principe est :

**Guichet → Opération → Critères → Questionnaire**

Lorsqu'un client accède au formulaire :

1. le système identifie le point de service ;
2. les opérations disponibles sont affichées ;
3. le client sélectionne l'opération ;
4. les critères correspondants sont chargés ;
5. le client répond ;
6. il peut laisser un commentaire ;
7. il valide.

Cette approche permet d'éviter de présenter au client des questions qui ne correspondent pas au service utilisé.

---

# 13. COLLECTE DES AVIS

Le client peut accéder au questionnaire par différents moyens.

Le principal canal peut être un QR Code placé au niveau du guichet ou du point de service.

D'autres canaux peuvent également être prévus :

* QR/Web ;
* USSD ;
* IVR ;
* autres canaux futurs.

Le système doit conserver le canal utilisé pour chaque avis.

---

# 14. PARCOURS CLIENT

Le parcours doit être court.

### Étape 1

Le client accède au questionnaire.

### Étape 2

Le système identifie le point de service.

### Étape 3

Le client sélectionne l'opération.

### Étape 4

Les critères sont affichés.

### Étape 5

Le client attribue ses évaluations.

### Étape 6

Il peut laisser un commentaire.

### Étape 7

Il valide.

### Étape 8

Le système confirme l'enregistrement.

---

# 15. GESTION D'UNE SOUMISSION

Une soumission représente l'avis complet d'un client.

Un client peut répondre à plusieurs critères.

Exemple :

* Accueil : 4/5 ;
* Rapidité : 3/5 ;
* Temps d'attente : 2/5 ;
* Professionnalisme : 5/5.

Ces quatre réponses constituent **un seul avis**.

Cette distinction est essentielle pour garantir l'exactitude des statistiques.

---

# 16. PROTECTION CONTRE LES DOUBLONS

Le système doit limiter les soumissions répétées ou abusives.

Des mécanismes de contrôle doivent permettre d'identifier :

* les doublons ;
* les réutilisations d'une même soumission ;
* les comportements anormaux ;
* les tentatives automatisées.

L'objectif est de préserver la fiabilité des statistiques.

---

# 17. TABLEAU DE BORD

Le tableau de bord présente une synthèse de la situation.

Il doit notamment afficher :

* nombre d'avis ;
* satisfaction moyenne ;
* taux de satisfaction ;
* évolution ;
* agences ;
* guichets ;
* agents ;
* alertes ;
* actions correctives.

Les informations affichées doivent être adaptées au rôle de l'utilisateur.

---

# 18. ANALYSE DE LA SATISFACTION

La plateforme doit permettre d'analyser les résultats selon :

* période ;
* agence ;
* guichet ;
* opération ;
* critère ;
* agent ;
* canal de collecte.

L'utilisateur doit pouvoir passer d'une vue globale à une vue détaillée.

---

# 19. COMPARAISON DES AGENCES

La Direction doit pouvoir comparer les agences.

Exemples d'indicateurs :

* nombre d'avis ;
* note moyenne ;
* taux de satisfaction ;
* évolution ;
* nombre d'alertes ;
* nombre d'actions correctives ;
* taux de résolution.

---

# 20. PERFORMANCE DES GUICHETS

Chaque guichet possède ses propres indicateurs.

La plateforme doit permettre d'identifier :

* les guichets performants ;
* les guichets en difficulté ;
* les périodes problématiques ;
* les critères faibles ;
* les problèmes récurrents.

---

# 21. PERFORMANCE DES AGENTS

Les responsables autorisés peuvent analyser les performances individuelles.

Indicateurs possibles :

* nombre d'avis associés ;
* note moyenne ;
* évolution ;
* taux de satisfaction ;
* comparaison avec les objectifs.

Ces données doivent être utilisées comme outil d'amélioration et non uniquement comme classement.

---

# 22. ANALYSE DES COMMENTAIRES

Les commentaires laissés par les clients peuvent être analysés afin d'identifier les sujets récurrents.

Exemples de thèmes :

* attente ;
* accueil ;
* disponibilité ;
* comportement ;
* rapidité ;
* information ;
* problème technique.

L'objectif est d'identifier les principales causes d'insatisfaction.

---

# 23. INTELLIGENCE ARTIFICIELLE

Un module d'intelligence artificielle peut assister l'analyse des commentaires.

Il peut notamment :

* identifier les thèmes ;
* détecter les tendances ;
* regrouper les commentaires similaires ;
* identifier les sujets d'insatisfaction ;
* identifier les sujets positifs ;
* produire une synthèse ;
* aider les responsables à comprendre les problèmes récurrents.

L'IA doit rester un outil d'assistance à la décision.

---

# 24. ALERTES

La plateforme doit pouvoir détecter automatiquement certaines situations nécessitant une intervention.

Exemple :

Un guichet est normalement ouvert et planifié, mais aucun avis n'est collecté pendant une période anormalement longue.

Le système peut alors générer une alerte.

Les alertes peuvent également être déclenchées par :

* une baisse importante de satisfaction ;
* un volume inhabituel d'avis négatifs ;
* un problème récurrent ;
* une action corrective en retard.

---

# 25. ACTIONS CORRECTIVES

Lorsqu'un problème est identifié, un responsable peut créer une action corrective.

Une action peut contenir :

* titre ;
* description ;
* responsable ;
* agence ;
* guichet ;
* priorité ;
* date de début ;
* échéance ;
* statut.

Les statuts peuvent être :

**À FAIRE → EN COURS → TERMINÉE**

---

# 26. SUIVI DES ACTIONS

Chaque changement important doit pouvoir être suivi.

Exemple :

> Action créée
> ↓
> Affectée à un responsable
> ↓
> En cours
> ↓
> Terminée

Le système doit permettre de savoir :

* qui est responsable ;
* quand l'action a été créée ;
* quand elle a été modifiée ;
* quel est son statut ;
* si elle est en retard.

---

# 27. ACTIONS PRIORITAIRES

Le système doit aider les responsables à identifier les problèmes les plus urgents.

Une priorité peut dépendre de :

* la gravité ;
* le nombre de clients concernés ;
* la répétition du problème ;
* la baisse de satisfaction ;
* l'ancienneté ;
* le délai de résolution.

---

# 28. PLANNING

Le module planning permet d'associer les agents aux guichets.

Exemple :

> Lundi
> Guichet 01 → Agent A
> Guichet 02 → Agent B

Le planning sert également de référence aux mécanismes de surveillance.

---

# 29. DÉTECTION DU SILENCE

Le système peut surveiller les guichets pendant leurs périodes d'activité.

Lorsqu'un guichet :

* est actif ;
* est planifié ;
* devrait recevoir des clients ;
* mais ne reçoit aucun avis pendant une période définie,

une alerte peut être générée.

Cette fonctionnalité permet notamment de détecter :

* un problème de collecte ;
* un QR Code inaccessible ;
* un problème technique ;
* un guichet inactif ;
* une anomalie opérationnelle.

---

# 30. NOTIFICATIONS

Les utilisateurs concernés peuvent recevoir des notifications concernant :

* nouvelles alertes ;
* nouvelles actions ;
* tâches en retard ;
* invitations ;
* rapports ;
* événements importants.

Les canaux de notification peuvent évoluer selon les besoins de l'entreprise.

---

# 31. RAPPORTS

Yeba doit permettre de consulter et produire des rapports.

Un rapport peut présenter :

* période ;
* nombre d'avis ;
* satisfaction ;
* évolution ;
* agences ;
* guichets ;
* agents ;
* critères ;
* alertes ;
* actions correctives ;
* principaux thèmes.

---

# 32. RAPPORT MENSUEL

Un rapport mensuel peut être généré automatiquement.

Il doit permettre de présenter la situation de l'entreprise sur le mois précédent.

La Direction peut recevoir une vision globale.

Les responsables d'agence peuvent recevoir une vision limitée à leur périmètre.

---

# 33. EXPORT DES DONNÉES

Les utilisateurs autorisés doivent pouvoir exporter certaines données.

Exemples :

* avis ;
* statistiques ;
* résultats par agence ;
* résultats par guichet ;
* rapports.

Les exports doivent respecter les droits d'accès de l'utilisateur.

---

# 34. ARCHIVAGE

Les éléments qui ne sont plus actifs peuvent être archivés.

Exemples :

* agences fermées ;
* guichets fermés ;
* anciennes alertes ;
* actions terminées.

L'archivage ne doit pas supprimer l'historique.

---

# 35. HISTORIQUE

La plateforme doit conserver les informations importantes dans le temps.

L'historique permet notamment de répondre à :

* Que s'est-il passé ?
* Quand ?
* Sur quel guichet ?
* Dans quelle agence ?
* Qui a traité le problème ?
* Quelle action a été effectuée ?
* Quel a été le résultat ?

---

# 36. RECHERCHE ET FILTRES

Les utilisateurs doivent pouvoir rechercher rapidement des informations.

La recherche peut concerner :

* agences ;
* guichets ;
* agents ;
* avis ;
* actions ;
* alertes.

Les filtres permettent de réduire les résultats selon différents critères.

---

# 37. RADAR DE QUALITÉ

Yeba peut fournir un indicateur global permettant d'évaluer le niveau de maturité qualité.

Le radar peut être basé sur cinq dimensions :

### 1. Planification

Les guichets sont-ils correctement planifiés ?

### 2. Mesurage

Les avis sont-ils suffisamment collectés ?

### 3. Surveillance

Les anomalies sont-elles détectées et traitées ?

### 4. Communication

Plusieurs canaux de collecte sont-ils utilisés ?

### 5. Amélioration

Les actions correctives sont-elles effectivement réalisées ?

Ces dimensions permettent d'obtenir une vision synthétique de la performance qualité.

---

# 38. OBJECTIFS

L'entreprise peut définir des objectifs.

Exemples :

* atteindre une note moyenne minimale ;
* atteindre un taux de satisfaction ;
* obtenir un nombre minimal d'avis ;
* réduire les alertes ;
* améliorer un critère spécifique.

La plateforme compare ensuite :

**Objectif**

avec

**Résultat obtenu**

---

# 39. INDICATEURS CLÉS

Les principaux KPI sont :

### Satisfaction

* note moyenne ;
* taux de satisfaction ;
* évolution.

### Collecte

* nombre d'avis ;
* évolution du volume ;
* avis par canal.

### Qualité

* critères les moins bien notés ;
* critères les mieux notés ;
* thèmes d'insatisfaction.

### Performance

* agences ;
* guichets ;
* agents.

### Amélioration

* alertes ;
* actions ;
* actions en retard ;
* actions terminées ;
* taux de résolution.

---

# 40. RÈGLES DE GESTION

### RG01

Une soumission complète représente un seul avis client.

### RG02

Les statistiques doivent être calculées à partir des avis et non du nombre de réponses aux critères.

### RG03

Les questionnaires doivent pouvoir être adaptés aux opérations.

### RG04

Les droits d'accès dépendent du rôle de l'utilisateur.

### RG05

Les utilisateurs d'une agence ne doivent pas accéder aux données d'une autre agence sans autorisation.

### RG06

L'archivage ne doit pas supprimer les données historiques.

### RG07

Une action corrective possède un cycle de vie.

### RG08

Les alertes doivent pouvoir être suivies jusqu'à leur traitement.

### RG09

Les objectifs doivent pouvoir être comparés aux résultats.

### RG10

Les traitements automatiques doivent pouvoir fonctionner sans intervention humaine.

---

# 41. EXIGENCES DE SÉCURITÉ

La plateforme doit garantir :

* l'authentification des utilisateurs ;
* la gestion des rôles ;
* la gestion des permissions ;
* l'isolation des données ;
* la protection des informations sensibles ;
* la validation des données ;
* la protection contre les soumissions abusives ;
* la traçabilité des actions importantes ;
* la gestion des comptes actifs et suspendus.

Les contrôles de sécurité doivent être appliqués au niveau du système et pas uniquement au niveau de l'interface.

---

# 42. EXPÉRIENCE UTILISATEUR

L'application doit être :

* moderne ;
* professionnelle ;
* simple ;
* intuitive ;
* responsive ;
* accessible ;
* rapide ;
* cohérente.

Elle doit être utilisable sur :

* ordinateur ;
* tablette ;
* smartphone.

Le formulaire client doit être particulièrement optimisé pour une utilisation mobile.

---

# 43. PRINCIPAUX ÉCRANS

## Espace public

* Accueil ;
* formulaire de satisfaction ;
* confirmation.

## Espace connecté

* Tableau de bord ;
* Agences ;
* Guichets ;
* Planning ;
* Personnel ;
* Opérations ;
* Critères ;
* Avis ;
* Analyse ;
* Alertes ;
* Actions correctives ;
* Archives ;
* Rapports ;
* Paramètres.

Les écrans visibles dépendent du rôle de l'utilisateur.

---

# 44. FLUX GLOBAL DU SYSTÈME

Le fonctionnement général peut être résumé ainsi :

```text
                 CLIENT
                    │
                    ▼
             FORMULAIRE D'AVIS
                    │
                    ▼
               COLLECTE
                    │
                    ▼
                ANALYSE
                    │
          ┌─────────┴─────────┐
          │                   │
       Résultats           Anomalies
          │                   │
          │                   ▼
          │                ALERTES
          │                   │
          │                   ▼
          │             ACTIONS CORRECTIVES
          │                   │
          │                   ▼
          │                SUIVI
          │                   │
          └─────────┬─────────┘
                    ▼
              AMÉLIORATION
                    │
                    ▼
              NOUVELLE MESURE
```

---

# 45. CYCLE COMPLET DE YEBA

Le cycle fonctionnel central est :

### 1. Configurer

L'entreprise configure ses agences, guichets, opérations et critères.

### 2. Collecter

Les clients donnent leur avis.

### 3. Mesurer

Les résultats sont transformés en indicateurs.

### 4. Analyser

Les responsables analysent les résultats.

### 5. Détecter

Les anomalies et problèmes sont identifiés.

### 6. Agir

Des actions correctives sont créées.

### 7. Suivre

Les actions sont suivies jusqu'à leur résolution.

### 8. Vérifier

Les résultats suivants permettent de vérifier si la situation s'améliore.

### 9. Améliorer

L'entreprise adapte ses pratiques en fonction des résultats.

---

# 46. ÉVOLUTION FUTURE

La plateforme doit être pensée pour pouvoir évoluer.

Des fonctionnalités supplémentaires pourront être ajoutées ultérieurement :

* application mobile ;
* nouveaux canaux de collecte ;
* intégration WhatsApp ;
* intégration SMS ;
* intégration de systèmes externes ;
* nouveaux modules d'intelligence artificielle ;
* analyses prédictives ;
* recommandations automatiques ;
* gestion avancée des réclamations ;
* benchmarking ;
* multi-entreprises ;
* personnalisation avancée des questionnaires.

---

# 47. CRITÈRES DE RÉUSSITE

Le projet sera considéré comme fonctionnel lorsque :

1. une entreprise peut être configurée ;
2. plusieurs agences peuvent être gérées ;
3. les utilisateurs peuvent être créés et affectés ;
4. les guichets peuvent être configurés ;
5. les opérations peuvent être créées ;
6. les critères peuvent être définis ;
7. les questionnaires peuvent être adaptés aux opérations ;
8. un client peut déposer un avis ;
9. les doublons peuvent être limités ;
10. les statistiques sont correctement calculées ;
11. les agences peuvent être comparées ;
12. les guichets peuvent être analysés ;
13. les agents peuvent être évalués ;
14. les commentaires peuvent être analysés ;
15. les alertes peuvent être générées ;
16. les actions correctives peuvent être créées ;
17. les actions peuvent être suivies ;
18. les rapports peuvent être produits ;
19. les données historiques sont conservées ;
20. les droits d'accès sont respectés ;
21. les notifications peuvent être envoyées ;
22. les traitements automatiques peuvent fonctionner ;
23. la plateforme est utilisable sur ordinateur et mobile.

---

# 48. VISION FINALE

Yeba doit permettre à une organisation de passer d'une logique de :

> **"Nous demandons aux clients s'ils sont satisfaits."**

à une logique beaucoup plus complète :

> **"Nous écoutons nos clients, nous mesurons leur expérience, nous identifions les problèmes, nous agissons et nous vérifions que la situation s'améliore."**

Yeba constitue ainsi une plateforme de **pilotage de la satisfaction client et d'amélioration continue de la qualité de service**.

Le système doit transformer les retours clients en informations exploitables, puis ces informations en décisions et en actions concrètes.
