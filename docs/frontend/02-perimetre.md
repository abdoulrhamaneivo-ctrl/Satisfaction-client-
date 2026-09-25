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

## 4. Échelle de notation (DÉCISION PRODUCT — 2026-08-29, AMENDÉE 2026-09-25/26)

**Choix initial (2026-08-29) : étoiles 1→5** (ScoreInput, Doc 03 §3), pour TOUS les critères.
Cette règle reste vraie **par défaut** (type SMILEY, échelle 1-5, `note5Vers100`) mais n'est plus
unitaire : le moteur de mesure (vague 1) autorise plusieurs types, chacun avec un `scoring_mode`
et une `orientation` EXPLICITES, stockés sur le critère. Référence complète :
`docs/SCORING_ARCHITECTURE.md` (§2 types → modes, §3 formules, §3 bis CES).

| Type | Mode(s) | Usage | Écran de saisie |
|---|---|---|---|
| SMILEY | `SMILEY` | note 1-5 (défaut historique, inchangé) | étoiles |
| OUI_NON | `BINARY` | question fermée, orientation portée par le critère (« Avez-vous rencontré un problème ? ») | deux boutons |
| QCM | `ORDINAL` | choix unique **noté explicitement** (1-10 ou Auto) | liste de boutons |
| CASES | `CASES_CATEGORICAL` / `CASES_WEIGHTED` | choix multiples : soit stats % (jamais noté), soit poids ± (base 100 + Σ clampé) | cases à cocher |
| ECHELLE | `NUMERIC` / `CES` | note continue 1..N, ou **effort perçu 1-5 / 1-7 (CES)** | boutons chiffres, ou libellés d'effort si CES |
| NPS | `NPS` | 0-10 natif (détracteurs / passifs / promoteurs) | 0-10 |
| TEXTE | `FREE_TEXT` | verbatim | zone de texte — **jamais noté** |

Invariants (doc de scoring, tests à l'appui) :

- **5 étoiles = très satisfait ; 1 étoile = très insatisfait** (inchangé pour SMILEY).
- Taux de satisfaction (statistiques) = % d'avis avec moyenne ≥ 4/5 sur l'échelle 1-5 — définition
  unique, partagée avec le backend.
- **NPS 0-10 et emojis ne sont plus exclus** (amendement 2026-09-26) : le type NPS est natif, et
  l'emoji reste un simple habillage du SMILEY. Comparaison entre échelles : prudente et explicite
  (le `/100` canonique est commun, la note métier ne l'est pas).
- L'ordre d'affichage des choix est de l'UX : le score ne dépend **jamais** de la position
  (`OptionCritere.id` + score explicite ; provenance `EXPLICIT`/`INFERRED`, jamais IA).
- Accessibilité : radiogroup ARIA, navigation clavier, libellé explicité par critère ; une question
  CES est annoncée « Effort : Très facile » et son échelle 1-7 n'affiche jamais des chiffres nus
  quand un libellé existe.

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

## 6. Carte des routes (état réel — alignée sur `main.wasp.ts`, vérifié 2026-09-26)

| Route | Accès | Spec |
|---|---|---|
| `/q/:code` | public (QR, code opaque à 10 caractères) | Doc 06 — Formulaire (l'ancienne `/q/:guichetId` énumérable est supprimée) |
| `/connexion` | public | Auth Wasp (`src/auth/`) |
| `/dashboard` | DIRECTION (vue réseau) / chef (vue agence) | Doc 04 + zone « Expérience client » (vague 1) |
| `/synthese` | DIRECTION (déclenche) / tous rôles lecture | Vague 1 Phase K — synthèse globale IA (agrégats + limites) |
| `/avis` | chef d'agence + direction cumulée | Doc 08 (verbatims filtrés RG16/RG17) |
| `/criteres` | DIRECTION, CHEF_AGENCE | Doc 02 §3 + éditeur d'options / mode CES (vague 1) |
| `/guichets`, `/planning` | tous rôles internes | Docs à spécifier |
| `/alertes-taches`, `/archives` | tous rôles internes | Docs à spécifier |
| `/admin/personnel`, `/admin/agences` | DIRECTION, CHEF_AGENCE / DIRECTION | Docs à spécifier |
| `/settings` | tous rôles internes | Doc 13 — branding |
| `/platform/*` | SUPER_ADMIN (hors espace entreprise) | Doc 12 |

---

## 7. Parcours utilisateurs (bout-en-bout)

### 7.1 Parcours CLIENT — le parcours critique (§13-§15)
QR au guichet → `/q/:code` (code opaque : le serveur résout agence + guichet) → écran d'accueil court du formulaire → sélection de l'OPÉRATION → critères chargés (au clic : accusé immédiat, l'étape avance) → commentaire optionnel (autosave) → envoi → écran de confirmation dans la page.
**Contrainte de temps : parcours complet < 60 secondes, et AUCUN bouton de validation d'étape** (l'accusé de réception est automatique — vague 1 Phase E). Aucun compte, aucune donnée personnelle obligatoire.

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

### 8bis. Vague 1 — refonte de la mesure (2026-09-25/26, multidisciplinarye)

Cette vague est **transverse** (backend + front) : elle touche la chaîne de mesure, pas une
écran de plus. Détail technique : `docs/SCORING_ARCHITECTURE.md` ; décisions : `00-INDEX.md` §3.

| Lot | Contenu | État |
|---|---|---|
| **Moteur** | `scoringEngine` déterministe (8 stratégies), résolution serveur par `optionId`, `score_source` + `Critere.version`, ambiguïtés explicites | ✅ |
| **Collecte** | Accusé <500 ms + autosave T2, payloads `optionId`/`valeur`, NPS 0-10, libellés CES, bornage des doublons | ✅ |
| **IA individuelle** | Analyse enrichie (sévérité, sous-thèmes, confiance, cohérence note↔texte), prompts versionnés | ✅ |
| **IA globale** | `GlobalExperienceAnalysis` + job hebdo (budget, seuil), page `/synthese` (résumé, irritants, tendances, anomalies, priorités, **limites**) | ✅ |
| **Indicateurs** | Catalogue de 23 définitions (formule + source), agrégat unique `getIndicateursExperience`, zone « Expérience client » du dashboard, feuille XLSX « Expérience », bandeau CES dans les rapports PDF | ✅ |
| **Administration** | Éditeur d'options (note explicite 1-10 / Auto, poids ±, code métier, ordre), édition de critère en ligne, mode CASES pondéré, mode CES 1-5/1-7 | ✅ |
| **CES** | Bandes 1-5/1-7, top box, orientation forcée, agrégat + démonstration (`scripts/activerQuestionCES.ts`) | ✅ |
| **Reste (à spécifier)** | Alerte « effort élevé » au-delà d'un seuil configurable ; comparaison inter-échelles (au-delà du `/100` canonique) ; formation/doc opérateur | ⬜ |

**Vérification de couverture** (leçon EMSP Connect) : les 23 critères de réussite §47 ont été parcourus ; les critères couverts par le front public = 7, 8, 9 (anti-rejeu visible par message d'erreur dédié), 21 (notification de confirmation), 23 (responsive). Les autres appartiennent aux phases F2-F4 — aucune fonctionnalité officielle ne reste orpheline sans doc prévue.
