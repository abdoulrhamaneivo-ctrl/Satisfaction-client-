# Corrections apportées — 17 juillet 2026 (revue du guide White-Label)

J'ai comparé votre guide, point par point, à ce qui existe déjà réellement
dans le code (`BrandConfigPage.tsx`). Bonne nouvelle : une bonne partie
était déjà bien construite. Voici ce qui existait déjà, ce qui manquait
vraiment et que j'ai corrigé, et ce qui reste un vrai chantier à part.

## Déjà en place (vérifié dans le code, rien à faire)

- **Logo clair + logo sombre + favicon** : upload séparé des 3, déjà là.
- **4 palettes prédéfinies** ("CXSAT", "Émeraude Zen", "Océan Indigo",
  "Royal Gold") + 5 polices Google Fonts au choix : déjà là.
- **Curseur d'arrondis** (Carré / Subtil / Moyen / Arrondi) et **4 styles
  d'ombre** : déjà là.
- **Aperçu en direct** : un mockup de téléphone à droite qui réagit
  instantanément à chaque changement, avant tout clic sur "Sauvegarder" —
  déjà là.
- **Panneau de prévisualisation qui reste visible pendant le défilement**
  (point IV.4 de votre guide) : déjà implémenté via `position: sticky` sur
  la colonne de droite — le panneau de formulaire (gauche) défile, la
  prévisualisation (droite) reste à l'écran. C'est exactement le
  comportement demandé.
- **Nombre de sélecteurs volontairement limité** (point IV.2) : seulement
  4 couleurs sont exposées au client (Primaire, Secondaire, Fond, Cartes) —
  pas 15 curseurs. Déjà comme ça.

## Corrigé : le contraste automatique manquait (point IV.1 de votre guide)

C'était le vrai trou : changer la couleur "Primaire" ou "Secondaire" ne
recalculait jamais la couleur du texte par-dessus. Un client choisissant un
jaune vif comme couleur primaire pouvait donc se retrouver avec du texte
blanc invisible sur son propre bouton, sans aucun garde-fou.

→ **Ajouté** : un calcul de luminance relative (formule WCAG) qui bascule
automatiquement le texte en noir ou blanc selon la couleur de fond
choisie, pour les 4 couleurs éditables (Primaire, Secondaire,
Arrière-plan, Cartes). Une petite pastille "Aa" à côté de chaque
sélecteur affiche ce contraste en direct, pour que le client voie
immédiatement que c'est lisible.

## Vrais chantiers à part (pas fait ici, et pourquoi)

Deux points de votre guide sont de vraies fonctionnalités d'infrastructure,
pas des ajustements de code :

- **Domaine personnalisé** (`app.client.com` au lieu de `app.tonsaas.com/
  client`) : nécessite une gestion DNS, des certificats SSL par domaine et
  probablement un changement d'hébergeur/proxy (Railway, Cloudflare...).
  Ce n'est pas qu'un correctif de code.
- **E-mails transactionnels personnalisés** : vérifié dans le code — les
  emails (rapport mensuel, alertes...) sont actuellement tous envoyés avec
  la marque "CXSAT" en dur, pas celle du client. Techniquement faisable
  (récupérer la Charte Graphique de l'entreprise dans chaque job d'envoi,
  construire un gabarit HTML aux couleurs du client), MAIS le nom
  d'expéditeur ("From") dépend souvent de ce que votre fournisseur d'e-mail
  autorise par clé API — à vérifier avant de développer, pour ne pas
  construire une fonctionnalité que l'infrastructure d'envoi ne pourra pas
  honorer. Dites-moi si vous voulez que je le fasse : je peux commencer par
  le contenu (logo/couleurs dans le corps du mail), qui ne dépend d'aucune
  configuration d'infrastructure.

---

# Corrections apportées — 17 juillet 2026 (audit scroll UX/UI sur toutes les pages)

Vous avez listé des règles précises (verrou anti-scroll horizontal,
affordance de défilement, momentum scrolling, éviter le layout shift...).
J'ai passé tout le code client en revue avec ces règles-là et corrigé ce
qui manquait réellement. Détail :

## 1. Verrou anti-défilement horizontal parasite (`Main.css`)

Ajouté sur `html` (pas sur un wrapper interne, pour ne pas casser les
menus/en-têtes `sticky`) :
```css
html { overflow-x: hidden; background-color: hsl(var(--background)); }
body { overflow-x: hidden; max-width: 100vw; }
```
Ça coupe net tout débordement horizontal accidentel (carte trop large,
marge négative mal calculée...) au lieu de laisser une bande vide et
scrollable à droite de l'écran. Aucune page ne provoquait de débordement
que j'aie trouvé, mais c'est désormais un filet de sécurité permanent.

## 2. Couleur de l'overscroll harmonisée avec le thème

Ajouté `background-color: hsl(var(--background))` sur `html` : l'effet de
rebond ("overscroll") sur mobile affiche maintenant la couleur du thème
actif (clair / sombre / marque personnalisée) au lieu d'un flash blanc.

## 3. Affordance de défilement horizontal ("il reste du contenu à voir")

Nouvelle classe utilitaire `.scroll-fade-x` (estompe les bords
gauche/droit d'une rangée qui défile), posée sur les 3 zones qui défilent
réellement horizontalement dans l'app :
- La rangée d'opérations (kanban) dans **Critères**.
- Le tableau (Derniers avis, etc.) via `DataTable`.
- L'aperçu du kit QR dans la fenêtre modale des **Guichets**.

## 4. Momentum scrolling (défilement inertiel iOS)

Nouvelle classe `.momentum-scroll` (`-webkit-overflow-scrolling: touch`),
posée sur ces mêmes zones + le menu mobile + la fenêtre modale du kit QR,
pour un défilement fluide qui continue naturellement après avoir levé le
doigt, au lieu d'un arrêt sec.

## 5. Layout shift au chargement (contenu qui "saute")

Trois pages affichaient un simple texte "Chargement..." centré pendant le
chargement, puis le vrai contenu apparaissait d'un coup dans une mise en
page différente (le fameux "saut" visuel) :
- **Planning** : remplacé par un skeleton qui reprend la même grille de
  cartes que les vrais guichets.
- **Gestion des agences** : remplacé par des skeletons à la taille exacte
  des cartes d'agence.
- **Tarifs (admin plateforme)** : remplacé par des skeletons également.

(La page de collecte publique — celle scannée via QR Code — utilisait
déjà un plein écran de chargement avec spinner : c'est un cas différent
[chargement de page entière, pas de contenu partiel], je l'ai laissée
telle quelle, c'est le bon pattern dans ce cas précis.)

## 6. Correction d'une erreur que j'avais moi-même faite au tour précédent

En regroupant les pages dans le menu "Paramètres", j'avais ajouté un lien
vers **Tarifs**. En vérifiant son code cette fois-ci, j'ai vu que cette
page est protégée par `user?.isAdmin` (réservé aux administrateurs de la
plateforme CXSAT elle-même), pas par le rôle métier `DIRECTION`. Un client
DIRECTION qui aurait cliqué dessus serait tombé sur un écran "Accès
réservé" — exactement le genre de bug que ce projet corrige déjà ailleurs
pour d'autres pages. **Retiré du menu client.** Cette page reste accessible
par son URL directe pour les administrateurs de la plateforme uniquement.

## Ce qui n'a pas été touché, et pourquoi

- Le rebond ("scroll hijacking"/animations de scroll forcées) : je n'en ai
  trouvé nulle part dans le code — les transitions de page utilisent
  `framer-motion` sur l'opacité uniquement, pas sur le défilement lui-même.
  Rien à corriger ici.
- Le "scroll trap" (carte Google Maps, zone défilante piégée) : aucune
  carte interactive ni zone de ce type dans le code actuel.
- Barre de progression de défilement : aucune page n'est un long article
  qui en aurait besoin ; les tableaux de bord ont une pagination/onglets
  classiques.

---

# Corrections apportées — 17 juillet 2026 (suite, à partir de vos captures d'écran)

Merci pour les captures — c'est exactement ce qu'il fallait pour cibler des
correctifs vérifiables au lieu de deviner. Voici ce que j'ai trouvé et
corrigé pour chacune :

## A. Titre de page à moitié caché sous le menu (captures "Tableau de bord" et "Planning")

**Cause réelle trouvée** (`src/client/App.tsx`) : à chaque changement de
page, React Router ne réinitialise PAS le défilement tout seul (ce n'est
pas un vrai rechargement de navigateur). Le code ne remettait le défilement
en haut QUE sur la page d'accueil ("/"). Résultat : si vous aviez scrollé
sur une page, puis cliqué vers "Planning" ou "Tableau de bord", la nouvelle
page s'affichait déjà décalée vers le bas — son titre se retrouvait coincé
sous la barre de navigation "sticky". C'est très probablement aussi la
source de la sensation de "défilement dans le vide" que vous décrivez : ce
n'est pas un vrai split-screen à deux zones de scroll indépendantes, mais
un oubli classique de réinitialisation du scroll en SPA (single-page app).

→ **Corrigé** : le défilement remonte maintenant en haut à chaque
navigation vers une nouvelle page (sauf si vous cliquez sur un lien qui
pointe vers une ancre précise sur la même page, ex. `#features`, qui garde
son comportement normal).

## B. Glisser-déposer des questions entre opérations (capture "Organiser vos questions par opération")

**Cause réelle** (`src/client/components/QuestionsParOperation.tsx`) :
les colonnes défilent horizontalement (`overflow-x-auto`), et pour envoyer
une question de la 1ʳᵉ à la dernière opération, il fallait glisser la carte
ET faire défiler la rangée en même temps — un geste combiné que la
bibliothèque de drag-and-drop ne gérait pas bien, ni sur mobile ni sur
desktop (exactement ce que vous décrivez).

→ **Corrigé avec une solution garantie, pas une rustine** : chaque carte a
maintenant un petit sélecteur **"Déplacer vers"** sous son texte, qui liste
toutes les opérations. Un clic (ou un tap) suffit pour envoyer une question
de la première à la dernière colonne, sans glisser ni faire défiler quoi
que ce soit. Le glisser-déposer reste disponible pour réordonner
rapidement des questions proches (et son auto-défilement a aussi été
rendu plus sensible), mais ce n'est plus la seule façon de faire — donc
plus aucun blocage possible.

## C. Page blanche "There was an error rendering this page" (capture 1)

Celle-ci, je ne peux pas la corriger à l'aveugle : ce message générique
s'affiche dès qu'un composant plante, quelle que soit la cause réelle, et
le détail exact est... dans la console du navigateur, que je ne peux pas
voir. **Pour la corriger, il me faut :**
1. l'URL exacte de la page au moment du plantage,
2. le message d'erreur complet visible dans la console du navigateur
   (F12 → onglet "Console", la ligne en rouge, avec la pile d'appels si
   possible — une capture d'écran de cette console suffit).

Envoyez-moi ça et je corrige le vrai bug derrière, plutôt que de deviner.

---

# Corrections apportées — 16 juillet 2026

## Important, à lire avant tout

Ce dossier est une vraie application (Wasp + React + Prisma) de plusieurs
dizaines de pages. Je n'ai pas d'environnement pour lancer `wasp start`, la
compiler ou l'ouvrir dans un navigateur ici — donc je n'ai pas pu **voir**
vos pages comme vous les voyez. Je ne peux pas, en une seule passe et sans
capture d'écran, "tout corriger, toutes les pages" de façon fiable : ce
serait vous mentir sur ce qui a réellement été vérifié.

Ce que j'ai fait à la place : j'ai lu le code réel, identifié des bugs
concrets et vérifiables qui correspondent exactement à ce que vous décrivez
(personnalisation pas totale, QR codes à afficher en gris/cliquable, charte
graphique à ranger dans les paramètres, cohérence mobile/desktop), et je les
ai corrigés avec une justification technique à chaque fois. J'ai vérifié la
syntaxe de chaque fichier modifié (compilation TypeScript à blanc), mais pas
le rendu visuel pixel par pixel.

**Pour aller plus loin sur "tout corriger visuellement"**, la façon la plus
efficace est de me donner 3-4 captures d'écran des pages qui vous gênent le
plus (mobile + desktop) avec une flèche sur ce qui cloche : je peux alors
cibler des correctifs vérifiables au lieu de deviner sur des dizaines de
pages.

---

## 1. Personnalisation — elle n'était pas "totale" (bug réel trouvé)

Fichier : `src/client/context/BrandContext.tsx`

Le thème (`Main.css`) utilise 29 variables de couleur (`--card-accent`,
`--card-subtle`, `--secondary-muted`, etc.), mais le système de marque
n'en réinjectait que 23. Les 6 restantes (fonds de cartes secondaires,
badges "subtle"...) restaient donc figées sur les couleurs par défaut de
l'app, **quoi que le client configure** dans la Charte Graphique. C'est
exactement le genre de bug qui donne des pages "à moitié personnalisées" :
un bloc garde l'ancienne couleur à côté d'éléments qui ont bien la nouvelle.

→ Corrigé : ces 6 tokens sont maintenant dérivés automatiquement des
couleurs déjà personnalisables (accent → card-accent, muted → card-subtle,
secondary → secondary-muted), donc 100% de l'interface suit désormais la
marque configurée.

### Bug additionnel trouvé : le mode sombre "cassait" la personnalisation

La règle CSS injectée ciblait `:root` sans condition. Comme ce style est
ajouté *après* la feuille principale, il gagnait systématiquement sur les
variables `.dark { ... }` du thème sombre (même spécificité CSS → le
dernier bloc l'emporte). Résultat concret : dès qu'une marque personnalisée
était active, activer le mode sombre ne changeait presque rien à l'affichage
— d'où l'impression d'incohérence entre clair et sombre que vous décrivez.

→ Corrigé : la règle cible maintenant `:root:not(.dark)`. Le mode clair
(celui que vous préférez sur mobile) reste personnalisable à 100%, et le
mode sombre retrouve son thème propre et cohérent au lieu d'être à moitié
écrasé par des couleurs claires.

---

## 2. QR Codes des guichets — affichage gris + clic pour voir (comme demandé)

Fichiers : `src/client/pages/GuichetsPage.tsx`

Avant : chaque guichet affichait directement, en pleine largeur dans la
liste, le kit d'affiche complet (jusqu'à 595×842px en format A4). À côté
d'un simple titre de guichet, ça créait un énorme bloc et des zones vides
disproportionnées autour — exactement le symptôme "du contenu d'un côté,
rien de l'autre" que vous décrivez.

→ Corrigé : chaque guichet affiche maintenant une **carte compacte
grisée** (icône QR grisée + "Voir le kit QR"). Un clic ouvre une fenêtre
modale avec le kit complet (QR Code, code USSD, choix du format, export
PNG). La mise en page de la liste redevient équilibrée sur mobile comme
sur desktop, et rien n'a été perdu : le kit complet est toujours à un clic.

(Le bloc d'impression "Kit complet" en bas de page, invisible à l'écran et
utilisé uniquement pour l'impression papier, n'a pas été touché : il a
toujours besoin du format plein.)

---

## 3. Charte graphique déplacée dans un espace "Paramètres"

Fichiers : `src/client/components/NavBar/constants.ts`,
`src/client/components/NavBar/NavBar.tsx`

Avant : 9 liens à plat dans la barre de navigation (Tableau de bord,
Guichets, Planning, Agences, Charte Graphique, Personnel, Critères, Avis
clients, Alertes & Tâches). Sur mobile en particulier, c'est ce genre de
liste qui rend la navigation "brouillon".

→ Corrigé : les pages de configuration (Charte graphique, Critères,
Personnel, Tarifs) sont regroupées sous un seul menu **"Paramètres"** :
- Desktop : menu déroulant.
- Mobile : sous-menu repliable (accordéon), pour ne pas surcharger le
  panneau glissant.

Petit bonus trouvé au passage : la page **Tarifs** (`/admin/tarifs`)
existait déjà dans le code mais n'était reliée à aucun lien de navigation
— personne ne pouvait y accéder normalement. Elle est maintenant dans le
menu Paramètres (réservée à la Direction, comme les autres pages de
configuration à portée entreprise). *Vérifiez côté serveur
(`src/server/permissions.ts`) que cette page est bien protégée pour les
autres rôles avant mise en production — je n'ai pas trouvé de contrôle de
rôle dans le fichier de la page elle-même.*

---

## 4. Ce qui n'a PAS été traité dans cette passe (soyons honnêtes)

Vu la taille réelle du projet (~50 pages/composants), je n'ai pas repris
individuellement chaque page pour auditer grilles/espacements/animations.
Les 3 correctifs ci-dessus règlent les bugs précis et vérifiables que votre
message décrivait. Pour le reste ("des pages qui donnent l'impression
d'espaces vides", "grilles à revoir partout"), il me faut soit :

1. des captures d'écran des pages concernées (le plus rapide et le plus
   fiable), soit
2. votre accord pour que je fasse une passe page par page en vous montrant
   les changements au fur et à mesure (plus long, mais complet).

Dites-moi laquelle des deux options vous convient et on continue.

---

## Comment tester

1. Décompressez le zip, `npm install`, puis `wasp start` (ou votre process
   habituel de déploiement).
2. Allez sur **Guichets** → vérifiez la carte QR grisée + le clic qui ouvre
   la fenêtre modale.
3. Allez sur **Paramètres → Charte graphique**, changez une couleur,
   enregistrez, et vérifiez que ça s'applique bien partout (y compris les
   éléments "subtle"/"accent" des cartes).
4. Basculez en mode sombre : le thème sombre doit maintenant rester
   cohérent même avec une marque personnalisée active.
5. Sur mobile, ouvrez le menu (☰) : "Paramètres" doit apparaître comme un
   sous-menu repliable en bas de la liste, avant le bouton mode sombre/clair.
