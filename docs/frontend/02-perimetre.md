# YEBA — Périmètre métier & source de vérité
## Doc 02 — Rôles, règles RG, échelle de notation, entités, parcours, roadmap

> **Source officielle** : cahier des charges fonctionnel Yeba (48 sections, fourni par Ivo le 2026-08-29). Chaque règle de ce document trace sa source §.
> **Rôle de ce doc** : TOUTE spec d'écran renvoie ici pour les rôles, règles et entités. Une règle métier vit UNE seule fois — ici.
> **Décision produit fondamentale (consignée au 00-INDEX)** : on construit LE FRONT d'abord (espace public + design), validé visuellement par Ivo, AVANT de brancher le backend. Le contrat API de chaque spec est donc écrit pour le schéma Prisma existant du dépôt backend (`~/Bureau/app`) mais consommé via mock au début.

---

## 1. Première entreprise déployée : La Poste de Côte d'Ivoire

Yeba est conçu multi-entreprises (long terme), mais le déploiement initial cible UNE entreprise : **La Poste de Côte d'Ivoire**. Conséquences concrètes :

- Le modèle `Entreprise` existe en base mais l'UI ne propose PAS de gestion multi-entreprises (pas de sélecteur, pas d'inscription publique).
- Le bandeau institutionnel (Doc 04 §5.5) et la charte Poste CI (Doc 04) sont appliqués en dur au niveau configuration, sans écran de personnalisation.
- Le vocabulaire des écrans parle d'« agences » (ex. Agence Treichville, Agence Cocody), de « guichets » (Guichet 01…) et d'« opérations » (Retrait, Dépôt, Envoi, Paiement facture, Renseignement…).

---

## 2. Rôles et matrice d'autorisations

Quatre rôles internes (source : cahier des charges §5, confirmés par le champ `role` du backend : DIRECTION, QUALITE, CHEF_AGENCE, AGENT). Le client (avisiteur) n'a PAS de compte (§5.5).

### 2.1 Matrice rôles × permissions (v1 — espace public + socle connecté)

| Action | DIRECTION | QUALITE | CHEF_AGENCE | AGENT | Client (sans compte) |
|---|---|---|---|---|---|
| Remplir le formulaire d'avis | — | — | — | — | **OUI** |
| Voir le tableau de bord global (toutes agences) | OUI | OUI | — | — | — |
| Voir le dashboard de SON agence | OUI | OUI | OUI | — | — |
| Gérer les agences (CRUD) | OUI | — | — | — | — |
| Gérer les guichets | OUI | — | OUI (les siens) | — | — |
| Gérer les agents / invitations | OUI | — | OUI (les siens) | — | — |
| Gérer opérations & critères | OUI | OUI | OUI (son agence) | — | — |
| Gérer le planning | — | — | OUI | lecture (le sien) | — |
| Consulter les avis bruts (notes + commentaires) | **—** (RG17 : chiffres uniquement) | — | **OUI (son agence)** | OUI (journalisé, RG18) | — |
| Coordonnées client de recontact (si laissées) | — | — | OUI (son agence, RG12) | — | — |
| Analyser / comparer | OUI | OUI | OUI (son agence) | — | — |
| Voir les moyennes PAR AGENT | OUI (k≥5, Doc 08) | les siennes | OUI (son agence, source brute) | les siennes | — |
| Traiter les alertes | OUI | OUI | OUI (son agence) | — | — |
| Créer actions correctives | OUI | OUI | OUI | — | — |
| Exécuter une action assignée | — | — | OUI | OUI (les siennes) | — |
| Exporter des données | OUI | OUI | OUI (son périmètre) | — | — |

**Règles dures** (source §5.2, RG04, RG05) :
1. R01 — Un CHEF_AGENCE ne peut JAMAIS lire ni écrire les données d'une autre agence (contrôle back-end systématique, l'UI masque mais le serveur tranche).
2. R02 — Un AGENT ne voit que son planning, ses affectations et les actions qui lui sont attribuées.
3. R03 — QUALITE voit tout mais ne gère AUCUNE structure (lecture + analyse + rapports uniquement).
4. R04 — Toute route connectée est protégée côté serveur ; le front ne fait qu'orienter (redirection vers /connexion si 401).

*(La matrice sera étendue dans les specs des docs 08+ au fil des modules connectés — toute extension est consignée ici d'abord.)*

---

## 3. Règles de gestion (RG) traduites en comportements front EXACTS

| RG (source) | Comportement front contractuel |
|---|---|
| RG01/§15 : une soumission = UN avis | Le formulaire (Doc 06) regroupe toutes les notes de critères dans UNE requête POST unique. Aucun POST partiel : bouton « Envoyer » unique en fin de parcours. Le compteur « avis » affiché n'est JAMAIS calculé côté client. |
| RG02/§15 : stats calculées sur les avis | Le front N'AFFICHE que des indicateurs renvoyés par l'API (jamais recalculés localement à partir des réponses). |
| RG03/§12 : questionnaire adapté à l'opération | Les critères affichés à l'étape 4 viennent de `GET /operations/{id}/criteres` — jamais d'une liste codée en dur. |
| RG04/RG05 : droits par rôle, isolation agence | Voir matrice §2. Le front redirige 401 → /connexion, 403 → écran « Accès non autorisé » (composant ErrorState). |
| RG06/§34 : archivage ≠ suppression | Les écrans de gestion affichent les éléments archivés dans une vue dédiée « Archives » avec action Restaurer — jamais de bouton Supprimer. |
| RG07/§25 : cycle de vie action | Composant Chip statut : À FAIRE (gris-200/texte noir) → EN COURS (jaune/texte noir) → TERMINÉE (succès). Transitions déclenchées par actions explicites uniquement. |
| RG08/§24 : alertes suivies jusqu'au traitement | Une alerte affichée dans tout dashboard est cliquable vers son détail ; statuts: NOUVELLE → VUE → TRAITÉE. |
| RG09/§38 : objectif vs résultat | Toute carte d'objectif affiche cible, obtenu, écart (%), flèche tendance. |
| RG10/§22-24 : traitements automatiques | Aucune UI de lancement manuel pour les jobs auto (alertes, rapport mensuel) — le front les CONSULTE, ne les déclenche pas. |
| RG11 (révisée — voir Doc 08, 2026-08-29) : rattachement d'un avis à un agent | L'avis est rattaché à l'agent via le guichet + l'affectation active du planning au moment de la soumission (calcul back-end), pour produire des agrégats d'amélioration. Le chef d'AGENCE y accède via les avis bruts de son agence (son outil managérial) ; DIRECTION/QUALITE en agrégat k≥5 ; l'AGENT voit sa propre tendance. Détail : Doc 08 §3. |
| RG12 (révisée — Doc 08) : coordonnées client OPTIONNELLES | Email/téléphone facultatifs, finalité unique = recontact service ; jamais obligatoires ; visibles uniquement de l'agence concernée ; purgées 90 jours après traitement. |
| RG13 (Doc 08) : k-anonymat ≥ 5 | Tout agrégat PAR AGENT exposé requiert ≥ 5 avis sous-jacents ; sinon afficher « Données insuffisantes ». |
| RG14 (Doc 08) : garde-fou RH | Les données par agent ne fondent jamais seules une sanction ; aucun export nominatif par agent. |
| RG15 (Doc 08) : anti-abus discret | Empreintes hachées salées, invisibles, purgées à 90 jours. |
| RG16 (Doc 08) : confidentialité côté serveur | Les endpoints ne contiennent physiquement pas les champs interdits au rôle (extension de RG04). |
| RG17 (Doc 08 — LA règle centrale) : les avis restent dans l'agence | Le chef d'agence voit les avis de son agence (verbatims + coordonnées). La DIRECTION reçoit chiffres/agrégats/thèmes, JAMAIS de verbatims ni coordonnées. Toute investigation fine passe par le chef d'agence. |
| RG18 (Doc 08) : accès QUALITE journalisé | L'accès QUALITE aux avis bruts est tracé (qui, quand, périmètre) et limité à l'analyse. |

---

## 4. Échelle de notation (DÉCISION PRODUCT — consignée 2026-08-29)

**Choix : étoiles 1→5** (ScoreInput, Doc 03 §3), pour TOUS les critères.

- 5 étoiles = très satisfait ; 1 étoile = très insatisfait. Étoiles lucide (`Star`), état sélectionné fond jaune `--poste-jaune` + icône noire, état vide bordure gris-200.
- Taux de satisfaction affiché (statistiques) = % d'avis avec moyenne ≥ 4/5 — définition unique, partagée avec le backend.
- NPS et emojis 😞😐😊 EXCLUS de la v1 (le canal USSD/IVR futur pourra introduire une échelle alternative par canal, avec comparaison prudente).
- Accessibilité ScoreInput : groupe radiogroup ARIA (chaque étoile = radio 1-5), navigation clavier flèches, libellé explicite par critère.

---

## 5. Entités métier (JSDoc — contrat partagé front/back)

Source : cahier des charges §6-§15 et schéma Prisma du backend (`~/Bureau/app/schema.prisma` — modèles Entreprise, Agence, Guichet, AffectationGuichet, Service(=Opération), Critere, CritereService, Reponse, Canal, Alerte, TacheCorrective, VoteAntiRejeu…). Le front utilise CES noms (anglais Prisma → API → français UI) :

```js
/**
 * @typedef {Object} Agence    { id, nom, localisation, adresse, statut: "ACTIVE"|"INACTIVE"|"ARCHIVEE", responsableId }
 * @typedef {Object} Guichet   { id, agenceId, nom, statut, codeQR, operations: Service[] }
 * @typedef {Object} Service   { id, nom }   // « opération » dans l'UI (Retrait, Dépôt…)
 * @typedef {Object} Critere   { id, nom, serviceIds, statut }
 * @typedef {Object} Avis      { id, guichetId, serviceId, canal, reponses: [{critereId, note}], commentaire, contact?: {email, telephone}, createdAt }
 * @typedef {Object} Alerte    { id, type, cible, statut: "NOUVELLE"|"VUE"|"TRAITEE", creeLe }
 * @typedef {Object} TacheCorrective { id, titre, description, responsableId, agenceId, guichetId, priorite, echeance, statut: "A_FAIRE"|"EN_COURS"|"TERMINEE", historique: [] }
 */
```

Hiérarchie (§6) : Entreprise → Agence → Guichet → Agent(affectations) → Opération → Critère → Avis. Toute donnée affichée porte son contexte complet.

---

## 6. Carte des routes (état v1 front — remplacera la carte du Doc 01 quand étendue)

| Route | Accès | Spec |
|---|---|---|
| `/` | public | Doc 05 — Accueil |
| `/avis/:guichetCode` | public (QR) | Doc 06 — Formulaire |
| `/avis/merci` | public (post-soumission) | Doc 07 — Confirmation |
| `/connexion` | public | future Doc 08 |
| `/app/*` (dashboard, agences, guichets, planning, personnel, opérations, critères, avis, analyse, alertes, actions, archives, rapports, paramètres — §43) | rôles internes | docs futurs 08+ (une spec par module, dans l'ordre de la roadmap §8) |

---

## 7. Parcours utilisateurs (bout-en-bout)

### 7.1 Parcours CLIENT — le parcours critique (§13-§15)
QR au guichet → `/avis/:guichetCode` (le code identifie agence+guichet) → écran d'accueil court du formulaire → sélection de l'OPÉRATION → critères chargés → notation étoiles → commentaire optionnel → envoi → `/avis/merci`.
**Contrainte de temps : parcours complet < 60 secondes, ≤ 4 interactions avant validation.** Aucun compte, aucune donnée personnelle obligatoire.

### 7.2 Parcours CHEF D'AGENCE (aperçu — détaillé en docs 08+)
Connexion → dashboard agence (avis, moyenne, alertes) → traite une alerte → crée une action corrective assignée à un agent → suit l'avancement.

---

## 8. Roadmap phases front (source : §47 critères de réussite + decisions produit)

| Phase | Contenu | Docs | État |
|---|---|---|---|
| **F0 — Socle design** | Migration Mint → Vite/React19/Tailwind4, tokens, composants shared, logo, charte | 01, 03, 04 | ✅ FAIT (2026-08-29) |
| **F1 — Espace public** | Accueil, Formulaire (mock API), Confirmation | 05, 06, 07 | ✅ construites (mock) — validation visuelle Ivo restante |
| **F2 — Auth + shell connecté** | /connexion, shell dashboard, RLS UI | 08+ | à spécifier |
| **F3 — Gestion structure** | Agences, guichets, personnel, opérations, critères, planning | 08+ | à spécifier |
| **F4 — Analyse & boucle qualité** | Avis, analyse, alertes, actions correctives, archives, rapports | 08+ | à spécifier |

**Vérification de couverture** (leçon EMSP Connect) : les 23 critères de réussite §47 ont été parcourus ; les critères couverts par le front public = 7, 8, 9 (anti-rejeu visible par message d'erreur dédié), 21 (notification de confirmation), 23 (responsive). Les autres appartiennent aux phases F2-F4 — aucune fonctionnalité officielle ne reste orpheline sans doc prévue.
