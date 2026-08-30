# YEBA — Confidentialité par niveau : les avis restent dans l'agence
## Doc 08 — Gouvernance des données : visibilité par rôle, identité optionnelle, garde-fous

> **Prérequis de lecture** : Doc 02 §2 (matrice rôles), §3 (RG). Ce document MODIFIE la matrice et définit RG12-RG18.
> **Origine** (révision du 2026-08-29, retour terrain du chef d'agence + décision Ivo) :
> 1. Le client PEUT laisser son email/numéro — en OPTIONNEL, uniquement pour être recontacté.
> 2. Le chef d'AGENCE voit les avis de son agence — c'est son outil de gestion autonome, ça va.
> 3. Le chef de l'ENTREPRISE (Direction) ne doit PAS lire ce que les clients disent (risque de « lui poser des problèmes ») : il reçoit des CHIFFRES, pas des verbatims.
> **Portée** : spécification transversale FRONT **et BACKEND** — la confidentialité est appliquée côté serveur, l'UI ne fait que refléter.

---

## 1. Le problème (formulé en ingénieur)

Si les avis verbatim remontent à la Direction, trois effets destructeurs :

1. **Le chef d'agence se sent surveillé depuis le sommet** : chaque commentaire client devient une pièce à charge potentielle que « le haut » lit sans le contexte terrain (un jour de pénurie personnel, une panne, une affluence exceptionnelle).
2. **Gestion défensive** : le chef optimise son image dans les commentaires au lieu de gérer son agence — il n'ose plus remonter les problèmes réels.
3. **La boucle qualité se casse** : la confiance entre le niveau central et le niveau agence est la condition pour que les alertes soient traitées honnêtement et pas cosmétiquement.

**Principe directeur** : **les avis sont la propriété opérationnelle de l'agence**. La Direction pilote par les chiffres ; quand un chiffre inquiète, elle interroge le chef d'agence — qui a le contexte et les verbatims. L'information fine ne monte pas ; les décisions redescendent.

---

## 2. Le modèle : trois piliers

### Pilier 1 — Identité client OPTIONNELLE et bornée (RG12 révisée)
- Le formulaire propose, en OPTION, un bloc « Être recontacté » : email et/ou téléphone. JAMAIS obligatoire, jamais une étape bloquante, jamais demandé deux fois.
- **Finalité unique : la recontacte service** (rappeler le client au sujet de SON avis — recovery, précision, résolution). Aucune autre finalité autorisée.
- Les coordonnées sont visibles UNIQUEMENT des rôles de l'agence concernée (chef d'agence), jamais de la Direction, jamais dans les exports.
- Consentement implicite par la saisie + libellé explicite de finalité sur le formulaire. Conformité **loi ivoirienne n°2013-450 (ARTCI)** : finalité déclarée, minimisation, durée.
- **Purge** : coordonnées supprimées 90 jours après le dernier traitement de l'avis associé (RG15 étendu).

### Pilier 2 — Les avis bruts restent au niveau AGENCE (RG17 — LA règle centrale)
- **CHEF_AGENCE** : accès complet aux avis de SON agence — notes, commentaires verbatim, coordonnées de recontact laissées par les clients. Il traite, répond, crée les actions correctives. (Décision Ivo : « certes lui il peut voir, en tant que chef de son agence ça va. »)
- **DIRECTION** : **chiffres uniquement** — agrégats, tendances, comparaisons d'agences, volumes, taux, alertes, statut des actions. AUCUN avis brut, AUCUN verbatim, AUCUNE coordonnée client. Les thèmes agrégés (IA §23) sont autorisés : ce sont des agrégats, non attribuables.
- **QUALITE** : accès d'ANALYSE aux avis (son rôle §5.3 du cahier des charges : analyser les avis et commentaires, produire les rapports) MAIS journalisé (RG18) — chaque accès aux verbatims est tracé, l'accès est un outil d'analyse, pas de sanction.
- Mécanisme d'escalade : si la Direction veut creuser un chiffre, elle crée une **demande d'analyse** (ou en discute en revue de performance) — le chef d'agence instruit avec les données fines. Le produit ne transporte jamais les verbatims vers le haut.

### Pilier 3 — Protection des AGENTS à tous les niveaux (RG13 + RG14 inchangées)
- Tout agrégat PAR AGENT exposé (Direction, Qualité) respecte le **k-anonymat : ≥ 5 avis sous-jacents**, sinon « Données insuffisantes ».
- **RG14** : les données par agent ne fondent jamais SEULES une sanction — outil de formation/coaching/planning. Aucun export nominatif par agent.
- L'AGENT voit SA tendance personnelle (auto-amélioration, pas de classement affiché).
- Le chef d'agence, qui voit les avis bruts de son agence, y voit l'attribution agent « d'après planning » — c'est son outil managérial ; le garde-fou RG14 s'applique à lui aussi comme politique RH.

---

## 3. Échelle de visibilité (LA table de référence — remplace toute autre formulation)

| Donnée | CLIENT | AGENT | CHEF_AGENCE | QUALITE | DIRECTION |
|---|---|---|---|---|---|
| Avis brut (notes + commentaire) | — | sa tendance personnelle | **OUI (son agence)** | OUI (journalisé, RG18) | **— (RG17 : chiffres uniquement)** |
| Coordonnées client (si laissées, optionnelles) | — | — | **OUI (son agence, recontact)** | — (jamais affichées à l'analyse) | **—** |
| Agrégats par guichet | — | — | OUI (son agence) | OUI | OUI |
| Agrégats par agent | — | les siens | OUI (son agence, source brute) | OUI (k≥5) | OUI (k≥5) |
| Thèmes agrégés / synthèses IA (§23) | — | — | OUI (son agence) | OUI | OUI (agrégat, conforme RG17) |
| Alertes & actions correctives | — | les siennes | son agence | tout | tout (statuts et chiffres) |
| Comparaison des agences (§19) | — | — | — | OUI | OUI |
| Empreintes anti-abus | — | — | — | — | — (hachées, purgées 90j, RG15) |

**Lecture clé** : la colonne DIRECTION ne contient QUE des agrégats et des thèmes. La colonne CHEF_AGENCE est la seule qui porte les verbatims et les coordonnées (périmètre : son agence).

---

## 4. Règles dures (RG12-RG18 — état consolidé, source : Doc 08)

- **RG12 (révisée)** — Coordonnées client (email/téléphone) OPTIONNELLES, finalité unique recontact, jamais obligatoires, visibles uniquement par l'agence concernée, purgées à 90 jours après traitement.
- **RG13** — Tout agrégat PAR AGENT exposé requiert ≥ 5 avis sous-jacents ; sinon « Données insuffisantes ».
- **RG14** — Les données par agent ne fondent jamais seules une sanction ; aucun export nominatif par agent.
- **RG15** — Anti-abus : empreintes hachées salées, invisibles, purgées à 90 jours ; coordonnées client purgées à 90 jours après dernier traitement.
- **RG16** — La confidentialité est appliquée CÔTÉ SERVEUR : les endpoints Direction ne contiennent physiquement ni verbatims ni coordonnées (l'UI masque, le serveur tranche — extension RG04).
- **RG17 (nouvelle — LA règle centrale)** — Les avis bruts et commentaires restent au niveau de l'agence. La Direction reçoit des chiffres/agrégats/thèmes, jamais de verbatims. Toute investigation fine passe par le chef d'agence concerné.
- **RG18 (nouvelle)** — L'accès QUALITE aux avis bruts est journalisé (qui, quand, quel périmètre) et limité à l'analyse ; il ne peut jamais servir de relais de sanction.

---

## 5. Éléments de confiance UI

1. **Badge du formulaire** (Doc 06) : icône `ShieldCheck` + « Votre avis reste confidentiel » + sous-ligne « Coordonnées optionnelles — seulement si vous souhaitez être recontacté ».
2. **Bloc recontact** (Doc 06, étape 3) : champs téléphone/email simplement présents, libellés « Facultatif » — AUCUNE question préalable ; le client les remplit s'il le veut, sinon rien n'est envoyé ; une seule ligne discrète de finalité (« Pour vous recontacter au sujet de votre avis. Jamais partagé. »).
3. **Confirmation** (Doc 07) : message adapté — « Votre avis est anonyme » si aucune coordonnée ; « Un responsable de votre agence peut vous recontacter » si coordonnées laissées.
4. **Page/Rubrique « Protection des données »** (footer, F2+) : en français simple — ce que Yeba collecte, ce qu'elle ne collecte pas, QUI voit quoi (table §3 simplifiée grand public), conformité loi 2013-450 (ARTCI).
5. **Wording Direction** : les écrans Direction valorisent le pilotage (« vos agences », « vos tendances », « vos points d'attention ») et affichent une mention pédagogique : « Les avis détaillés restent suivis par les chefs d'agence — pour préserver la confiance et la qualité des retours. »
6. **Journal d'accès** (écran Qualité, F4+) : la traçabilité RG18 est visible des rôles autorisés — la transparence protège tout le monde.

---

## 6. Contrat backend (exigences transmises au dépôt `~/Bureau/app`)

1. Endpoints DIRECTION : `/api/direction/aggregates/*` uniquement — les modèles de réponse ne contiennent AUCUN champ verbatim/coordination (RG16+RG17). Pas d'endpoint « avis bruts » accessible à ce rôle (403 systématique).
2. Endpoints CHEF_AGENCE : `/api/agence/:id/avis` — inclut verbatims + coordonnées de recontact, filtré serveur sur SON agence.
3. Endpoints QUALITE : accès avis pour analyse + écriture systématique d'une ligne `Logs` (rôle, cible, horodatage) — RG18.
4. `VoteAntiRejeu` : empreinte hachée salée, purge 90 jours, jamais exportée.
5. Coordonnées : table dédiée liée à l'avis, finalité « recontact », job de purge 90 jours après dernier traitement ; exclues de tous les exports (§33) et de l'API d'analyse.
6. Les exports (§33) : chiffres et agrégats seulement — aucune ventilation nominative par agent, aucune coordonnée client.

---

## 7. Checklist confidentialité (PR de tout écran manipulant des avis)

1. ☐ Le rôle testé ne voit que ce que la table §3 lui autorise (test API : payload sans champs interdits, pas seulement UI masquée).
2. ☐ Aucun verbatim ni coordonnée n'est servible à un endpoint Direction (RG17/RG16).
3. ☐ Agrégats par agent : k≥5 respecté + état « Données insuffisantes » (RG13).
4. ☐ Accès QUALITE aux verbatims journalisés (RG18).
5. ☐ Bloc recontact : optionnel, finalité affichée, jamais bloquant (RG12).
6. ☐ Wording conforme §5 (pas de vocabulaire de surveillance côté Direction ; pédagogie de confiance).
7. ☐ Exports testés : aucun verbatim, aucune coordonnée, aucun nominatif par agent.

---

## 8. Frontières

- La détection du silence et les alertes (§24, §29) restent techniques, au niveau GUICHET — elles ne révèlent jamais un individu.
- Le module IA (§23) travaille sur les commentaires côté serveur et restitue thèmes/synthèses agrégées — il ne produit jamais de liste nominative ni de ré-identification.
- Toute future fonctionnalité (§46 : WhatsApp, mobile, benchmarking, multi-entreprises) hérite de ce document. Toute exception = nouvelle décision consignée au 00-INDEX §3.
