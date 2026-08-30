# CAHIER DES CHARGES FONCTIONNEL — YEBA — PLATEFORME DE PILOTAGE DE LA SATISFACTION CLIENT

> SOURCE MÉTIER OFFICIELLE — fournie par Ivo le 2026-08-29. Toute spec de docs/frontend/ trace ses règles vers les § de ce document. Document conservé tel quel.

## 1. PRÉSENTATION DU PROJET

Yeba est une plateforme numérique destinée à permettre aux entreprises de collecter, centraliser, analyser et exploiter les retours de leurs clients afin d'améliorer continuellement la qualité de leurs services.

La plateforme est conçue pour les organisations disposant de plusieurs agences, guichets, points de service ou équipes en contact avec les clients.

Yeba permet de suivre l'expérience client depuis la collecte de l'avis jusqu'à la mise en œuvre et au suivi des actions correctives.

## 2. PROBLÉMATIQUE

Les entreprises peuvent rencontrer plusieurs difficultés dans le suivi de la satisfaction client : difficulté à collecter régulièrement les avis ; dispersion des informations ; manque de visibilité sur la satisfaction réelle des clients ; difficulté à comparer les agences ; difficulté à identifier les guichets ou services problématiques ; absence de suivi structuré des réclamations et insatisfactions ; difficulté à transformer les avis en actions concrètes ; production manuelle de rapports ; manque de suivi des actions correctives.

Yeba répond à ces problématiques en centralisant l'ensemble du processus.

## 3. OBJECTIF GÉNÉRAL

Fournir à l'entreprise un outil permettant de : **Collecter → Mesurer → Analyser → Détecter → Agir → Suivre → Améliorer**.

La plateforme ne doit donc pas être considérée comme un simple outil de sondage. Elle doit constituer un véritable système de pilotage de la qualité et de l'expérience client.

## 4. OBJECTIFS SPÉCIFIQUES

Yeba doit permettre de : gérer l'organisation de l'entreprise ; gérer les agences ; gérer les guichets ; gérer les collaborateurs ; gérer les opérations ; définir les critères d'évaluation ; construire des questionnaires adaptés aux services ; collecter les avis clients ; analyser les résultats ; comparer les performances ; détecter les situations anormales ; générer des alertes ; créer des actions correctives ; suivre les actions ; analyser les commentaires clients ; produire des rapports ; conserver l'historique ; faciliter la prise de décision.

## 5. UTILISATEURS DE LA PLATEFORME

### 5.1. Direction
Vision globale de l'entreprise : consulter les indicateurs globaux ; comparer les agences ; consulter les avis ; analyser les tendances ; consulter les alertes ; suivre les actions correctives ; consulter les rapports ; gérer les agences ; gérer les responsables selon ses autorisations.

### 5.2. Chef d'agence
Gère les activités liées à son agence : tableau de bord de son agence ; guichets ; agents ; opérations ; critères ; affectations ; planning ; avis ; statistiques ; alertes ; actions correctives. Il ne doit pas pouvoir accéder aux informations d'une agence à laquelle il n'est pas rattaché.

### 5.3. Responsable qualité
Vision orientée analyse et amélioration : indicateurs ; avis ; commentaires ; tendances ; alertes ; actions correctives ; comparaison des performances ; rapports.

### 5.4. Agent
Collaborateur affecté à un ou plusieurs guichets. Selon ses autorisations : son planning ; son affectation ; certaines informations liées à son activité ; les actions qui lui sont attribuées.

### 5.5. Client
Utilisateur final du système de collecte. Ne doit pas nécessairement créer de compte. Parcours : accéder au questionnaire ; sélectionner l'opération effectuée ; évaluer les critères ; ajouter un commentaire ; envoyer son avis ; recevoir une confirmation. Le parcours doit être extrêmement simple et rapide.

## 6. ORGANISATION DE L'ENTREPRISE

Hiérarchie : **Entreprise → Agences → Guichets → Agents → Opérations → Critères → Avis clients**. Cette organisation permet de rattacher chaque avis à son contexte.
Exemple : Agence Cocody → Guichet 03 → Opération : Retrait → Critère : Temps d'attente → Avis client.

## 7. GESTION DES AGENCES

Créer, modifier, consulter, désactiver, archiver, restaurer une agence. Informations : nom, localisation, adresse, responsable, statut. Une agence désactivée ou archivée ne doit pas entraîner la suppression de son historique.

## 8. GESTION DES GUICHEts

Chaque agence peut posséder plusieurs guichets. Un guichet peut être créé, modifié, activé, désactivé, archivé, restauré. Un guichet peut être associé à : des agents ; des opérations ; un planning ; un dispositif de collecte.

## 9. GESTION DES AGENTS

Informations : nom, prénom, email, téléphone, rôle, agence, statut. Les responsables autorisés peuvent : ajouter, inviter, modifier les informations, modifier les affectations, suspendre, réactiver.

## 10. GESTION DES OPÉRATIONS

Une opération correspond au service effectué par le client : retrait, dépôt, paiement, renseignement, ouverture de compte, réclamation, transfert, autre service. Chaque opération peut être associée à plusieurs critères.

## 11. GESTION DES CRITÈRES

Éléments sur lesquels le client donne son appréciation : accueil, rapidité, temps d'attente, disponibilité, qualité des informations, professionnalisme, satisfaction globale. Les critères peuvent être créés, modifiés, activés, désactivés, archivés, associés à des opérations.

## 12. QUESTIONNAIRES DYNAMIQUES

Principe : **Guichet → Opération → Critères → Questionnaire**. Lorsqu'un client accède au formulaire : le système identifie le point de service ; les opérations disponibles sont affichées ; le client sélectionne l'opération ; les critères correspondants sont chargés ; le client répond ; il peut laisser un commentaire ; il valide. Cette approche évite de présenter des questions qui ne correspondent pas au service utilisé.

## 13. COLLECTE DES AVIS

Le principal canal : QR Code placé au niveau du guichet ou du point de service. Autres canaux prévus : QR/Web ; USSD ; IVR ; autres canaux futurs. Le système doit conserver le canal utilisé pour chaque avis.

## 14. PARCOURS CLIENT

1. Le client accède au questionnaire. 2. Le système identifie le point de service. 3. Le client sélectionne l'opération. 4. Les critères sont affichés. 5. Le client attribue ses évaluations. 6. Il peut laisser un commentaire. 7. Il valide. 8. Le système confirme l'enregistrement.

## 15. GESTION D'UNE SOUMISSION

Une soumission représente l'avis complet d'un client (ex. Accueil 4/5, Rapidité 3/5, Temps d'attente 2/5, Professionnalisme 5/5 = **un seul avis**). Cette distinction est essentielle pour garantir l'exactitude des statistiques.

## 16. PROTECTION CONTRE LES DOUBLONS

Limiter les soumissions répétées ou abusives : doublons ; réutilisations d'une même soumission ; comportements anormaux ; tentatives automatisées. Objectif : préserver la fiabilité des statistiques.

## 17. TABLEAU DE BORD

Synthèse : nombre d'avis ; satisfaction moyenne ; taux de satisfaction ; évolution ; agences ; guichets ; agents ; alertes ; actions correctives. Les informations affichées doivent être adaptées au rôle de l'utilisateur.

## 18. ANALYSE DE LA SATISFACTION

Analyse selon : période ; agence ; guichet ; opération ; critère ; agent ; canal de collecte. Passage d'une vue globale à une vue détaillée.

## 19. COMPARAISON DES AGENCES

Indicateurs : nombre d'avis ; note moyenne ; taux de satisfaction ; évolution ; nombre d'alertes ; nombre d'actions correctives ; taux de résolution.

## 20. PERFORMANCE DES GUICHEts

Identifier : guichets performants ; guichets en difficulté ; périodes problématiques ; critères faibles ; problèmes récurrents.

## 21. PERFORMANCE DES AGENTS

Indicateurs : nombre d'avis associés ; note moyenne ; évolution ; taux de satisfaction ; comparaison avec les objectifs. Ces données doivent être utilisées comme outil d'amélioration et non uniquement comme classement.

## 22. ANALYSE DES COMMENTAIRES

Identifier les sujets récurrents : attente ; accueil ; disponibilité ; comportement ; rapidité ; information ; problème technique. Objectif : identifier les principales causes d'insatisfaction.

## 23. INTELLIGENCE ARTIFICIELLE

Module d'assistance : identifier les thèmes ; détecter les tendances ; regrouper les commentaires similaires ; identifier les sujets d'insatisfaction et positifs ; produire une synthèse. L'IA doit rester un outil d'assistance à la décision.

## 24. ALERTES

Détection automatique : guichet planifié sans avis collecté pendant une période anormalement longue ; baisse importante de satisfaction ; volume inhabituel d'avis négatifs ; problème récurrent ; action corrective en retard.

## 25. ACTIONS CORRECTIVES

Contenu : titre, description, responsable, agence, guichet, priorité, date de début, échéance, statut. Statuts : **À FAIRE → EN COURS → TERMINÉE**.

## 26. SUIVI DES ACTIONS

Cycle : Action créée → Affectée à un responsable → En cours → Terminée. Le système doit permettre de savoir : qui est responsable ; quand l'action a été créée/modifiée ; son statut ; si elle est en retard.

## 27. ACTIONS PRIORITAIRES

La priorité peut dépendre de : la gravité ; le nombre de clients concernés ; la répétition du problème ; la baisse de satisfaction ; l'ancienneté ; le délai de résolution.

## 28. PLANNING

Associer les agents aux guichets (ex. Lundi : Guichet 01 → Agent A). Le planning sert également de référence aux mécanismes de surveillance.

## 29. DÉTECTION DU SILENCE

Surveiller les guichets pendant leurs périodes d'activité : guichet actif et planifié mais aucun avis pendant une période définie → alerte. Détecte : problème de collecte ; QR Code inaccessible ; problème technique ; guichet inactif ; anomalie opérationnelle.

## 30. NOTIFICATIONS

Nouvelles alertes ; nouvelles actions ; tâches en retard ; invitations ; rapports ; événements importants. Les canaux de notification peuvent évoluer selon les besoins.

## 31. RAPPORTS

Un rapport peut présenter : période ; nombre d'avis ; satisfaction ; évolution ; agences ; guichets ; agents ; critères ; alertes ; actions correctives ; principaux thèmes.

## 32. RAPPORT MENSUEL

Généré automatiquement pour le mois précédent. Vision globale pour la Direction ; vision limitée au périmètre pour les responsables d'agence.

## 33. EXPORT DES DONNÉES

Avis ; statistiques ; résultats par agence ; résultats par guichet ; rapports. Les exports doivent respecter les droits d'accès de l'utilisateur.

## 34. ARCHIVAGE

Archivage des éléments inactifs : agences fermées ; guichets fermés ; anciennes alertes ; actions terminées. L'archivage ne doit pas supprimer l'historique.

## 35. HISTORIQUE

Répondre à : Que s'est-il passé ? Quand ? Sur quel guichet ? Dans quelle agence ? Qui a traité le problème ? Quelle action a été effectuée ? Quel a été le résultat ?

## 36. RECHERCHE ET FILTRES

Recherche : agences ; guichets ; agents ; avis ; actions ; alertes. Les filtres permettent de réduire les résultats selon différents critères.

## 37. RADAR DE QUALITÉ

Indicateur de maturité qualité sur cinq dimensions : 1. Planification (guichets correctement planifiés ?) ; 2. Mesurage (avis suffisamment collectés ?) ; 3. Surveillance (anomalies détectées et traitées ?) ; 4. Communication (plusieurs canaux de collecte ?) ; 5. Amélioration (actions correctives réalisées ?).

## 38. OBJECTIFS

L'entreprise peut définir des objectifs (note moyenne minimale ; taux de satisfaction ; nombre minimal d'avis ; réduction des alertes ; amélioration d'un critère). La plateforme compare **Objectif** avec **Résultat obtenu**.

## 39. INDICATEURS CLÉS

Satisfaction : note moyenne ; taux de satisfaction ; évolution. Collecte : nombre d'avis ; évolution du volume ; avis par canal. Qualité : critères les moins/mieux notés ; thèmes d'insatisfaction. Performance : agences ; guichets ; agents. Amélioration : alertes ; actions ; actions en retard ; actions terminées ; taux de résolution.

## 40. RÈGLES DE GESTION

- **RG01** : une soumission complète représente un seul avis client.
- **RG02** : les statistiques sont calculées à partir des avis et non du nombre de réponses aux critères.
- **RG03** : les questionnaires doivent pouvoir être adaptés aux opérations.
- **RG04** : les droits d'accès dépendent du rôle de l'utilisateur.
- **RG05** : les utilisateurs d'une agence ne doivent pas accéder aux données d'une autre agence sans autorisation.
- **RG06** : l'archivage ne doit pas supprimer les données historiques.
- **RG07** : une action corrective possède un cycle de vie.
- **RG08** : les alertes doivent pouvoir être suivies jusqu'à leur traitement.
- **RG09** : les objectifs doivent pouvoir être comparés aux résultats.
- **RG10** : les traitements automatiques doivent pouvoir fonctionner sans intervention humaine.

## 41. EXIGENCES DE SÉCURITÉ

Authentification ; gestion des rôles et permissions ; isolation des données ; protection des informations sensibles ; validation des données ; protection contre les soumissions abusives ; traçabilité des actions importantes ; gestion des comptes actifs et suspendus. Les contrôles de sécurité doivent être appliqués au niveau du système et pas uniquement au niveau de l'interface.

## 42. EXPÉRIENCE UTILISATEUR

Moderne, professionnelle, simple, intuitive, responsive, accessible, rapide, cohérente. Utilisable sur ordinateur, tablette, smartphone. Le formulaire client doit être particulièrement optimisé pour une utilisation mobile.

## 43. PRINCIPAUX ÉCRANS

Espace public : Accueil ; formulaire de satisfaction ; confirmation.
Espace connecté : Tableau de bord ; Agences ; Guichets ; Planning ; Personnel ; Opérations ; Critères ; Avis ; Analyse ; Alertes ; Actions correctives ; Archives ; Rapports ; Paramètres.
Les écrans visibles dépendent du rôle de l'utilisateur.

## 44. FLUX GLOBAL DU SYSTÈME

CLIENT → FORMULAIRE D'AVIS → COLLECTE → ANALYSE → {Résultats | Anomalies → ALERTES → ACTIONS CORRECTIVES → SUIVI} → AMÉLIORATION → NOUVELLE MESURE.

## 45. CYCLE COMPLET DE YEBA

1. Configurer (agences, guichets, opérations, critères) → 2. Collecter → 3. Mesurer → 4. Analyser → 5. Détecter → 6. Agir → 7. Suivre → 8. Vérifier → 9. Améliorer.

## 46. ÉVOLUTION FUTUREnetacad

Application mobile ; nouveaux canaux de collecte ; intégration WhatsApp ; intégration SMS ; intégration de systèmes externes ; nouveaux modules d'IA ; analyses prédictives ; recommandations automatiques ; gestion avancée des réclamations ; benchmarking ; multi-entreprises ; personnalisation avancée des questionnaires.

## 47. CRITÈRES DE RÉUSSITE

1. Une entreprise peut être configurée ; 2. plusieurs agences gérées ; 3. utilisateurs créés et affectés ; 4. guichets configurés ; 5. opérations créées ; 6. critères définis ; 7. questionnaires adaptés aux opérations ; 8. un client peut déposer un avis ; 9. les doublons limités ; 10. statistiques correctement calculées ; 11. agences comparées ; 12. guichets analysés ; 13. agents évalués ; 14. commentaires analysés ; 15. alertes générées ; 16. actions correctives créées ; 17. actions suivies ; 18. rapports produits ; 19. historique conservé ; 20. droits d'accès respectés ; 21. notifications envoyées ; 22. traitements automatiques fonctionnels ; 23. plateforme utilisable sur ordinateur et mobile.

## 48. VISION FINALE

Passer de « Nous demandons aux clients s'ils sont satisfaits. » à « Nous écoutons nos clients, nous mesurons leur expérience, nous identifions les problèmes, nous agissons et nous vérifions que la situation s'améliore. »

Yeba constitue ainsi une plateforme de **pilotage de la satisfaction client et d'amélioration continue de la qualité de service**. Le système doit transformer les retours clients en informations exploitables, puis ces informations en décisions et en actions concrètes.
