# YÉBA — PROMPT MAÎTRE POUR STITCH (design UI complet)

> Comment utiliser ce document :
> 1. Copie la section « CONTEXTE GLOBAL » + la section de l'écran voulu dans Stitch.
> 2. Génère un écran à la fois (Stitch gère mieux un écran par prompt).
> 3. Pour garder la cohérence, commence TOUJOURS par l'écran « Landing », puis
>    demande à Stitch « same visual style » pour les suivants.

---

## CONTEXTE GLOBAL (à coller au début de CHAQUE prompt)

Design a mobile-first and desktop-responsive web app screen for **Yéba**, a
customer-satisfaction platform for service businesses in Côte d'Ivoire.
Clients scan a QR code at a service counter and rate their experience;
managers see live dashboards.

**Brand identity:**
- Primary green: #00A651 (buttons, active states, links). Deep green: #00843D (hover, headings accents).
- Accent yellow: #FFC72C (highlights, badges, secondary accents). Deep yellow: #FFB300.
- Background light mode: warm off-white #FAF9F5. Cards: pure white with soft shadow, 16-24px rounded corners.
- Dark mode available but LIGHT MODE is the default.
- Typography: modern geometric sans-serif (Satoshi/Inter style). Bold titles, regular body. NEVER use font-black/heavy weights.
- Style reference: **Notion / iOS / Linear** — clean, airy, generous whitespace,
  soft shadows only (no glassmorphism, no gradients on cards, no neon glows).
- Subtle motion: gentle fade/slide-in animations, smooth transitions. Animated
  background allowed ONLY as very faint (5% opacity) floating green/yellow blobs.
- Icons: Lucide style, thin stroke.
- Language: ALL UI text in FRENCH.
- Tone: professional yet warm. No clutter, max 1 primary action per screen.

---

## ÉCRAN 1 — LANDING PAGE (public)

Design the public landing page of Yéba.

**Structure (top to bottom):**
1. **Navbar** (transparent over hero): logo "Yéba" (green leaf/counter icon),
   links: Fonctionnalités, Tarifs, FAQ; buttons: « Se connecter » (ghost) and
   « Démarrer gratuitement » (solid green).
2. **Hero**: left = headline « Mesurez la satisfaction de vos clients en temps réel »
   + subheadline « Un QR code au guichet, vos clients donnent leur avis en 30 secondes,
   vous pilotez la qualité depuis votre tableau de bord. » + 2 CTAs (« Démarrer
   gratuitement » green, « Voir la démo » outline). Right = photo card of an African
   business woman at a counter smiling, with floating mini-cards around it:
   a CSAT score card « 4.6 ★ », a notification card « Nouvel avis · Guichet 3 ».
3. **Social proof strip**: « Déjà adopté par des services qui comptent » + 4 grayscale logos placeholders.
4. **Features grid** (3 cards): 📊 « Pilotage en temps réel » / 🔔 « Alertes immédiates SMS & WhatsApp » / ✨ « Analyse IA des commentaires ».
5. **How it works** (3 steps horizontal): 1. Imprimez le QR code → 2. Le client note son expérience → 3. Vous suivez les scores en direct. Numbered circles green.
6. **Animated stats band** (yellow-tinted background): « 30s pour donner un avis » · « +25% satisfaction moyenne » · « 100% anonyme ».
7. **Testimonial section**: 2 cards with African customer photos, name, role, quote.
8. **Pricing teaser**: 2 plans cards (Starter free / Pro) with feature checklists.
9. **Final CTA band** (green background): « Prêt à écouter vos clients ? » + white button.
10. **Footer**: logo, columns Produit/Ressources/Légal, social icons, © Yéba.

Mobile: everything stacks; hero photo below text; hamburger menu.

---

## ÉCRAN 2 — AUTHENTIFICATION (connexion + inscription)

Design the login page AND the signup page (two variants).

**Layout:** split screen. Left (desktop only): brand panel — deep green
background, faint animated blobs, white Yéba logo, one testimonial quote, small
illustration of a dashboard preview. Right: the form card on off-white background.

**Login form:** title « Bon retour ! 👋 », email field, password field with
show/hide eye icon, link « Mot de passe oublié ? », primary button « Se connecter »
(full-width green), divider « ou », button « Continuer avec Google » (outline),
footer link « Pas encore de compte ? Créez-en un ».

**Signup form:** title « Créez votre espace Yéba », fields: Nom complet, Nom de
l'entreprise, Email, Mot de passe (with strength indicator weak/good/strong),
checkbox CGU « J'accepte les conditions », button « Créer mon compte », footer
link to login. Add a progress hint « Essai gratuit 14 jours · Sans carte bancaire ».

**Forgot password screen:** single centered card: « Réinitialiser le mot de
passe », email field, green button « Envoyer le lien », back arrow to login.
Include a success state variant: green check illustration + « Email envoyé !
Vérifiez votre boîte de réception. »

---

## ÉCRAN 3 — ONBOARDING (première connexion, 3 étapes)

Design a 3-step onboarding wizard shown after first login (modal or full-screen).

- **Step header**: step dots (● ○ ○), skip link top-right « Passer ».
- **Step 1 — « Bienvenue chez Yéba »**: friendly illustration, text « Configurez
  votre entreprise en 2 minutes », green button « Commencer ».
- **Step 2 — « Créez votre première agence »**: form fields Nom de l'agence,
  Ville, Téléphone du responsable. Button « Continuer ».
- **Step 3 — « Créez un guichet et imprimez son QR code »**: form Nom du guichet +
  selection of services (chips with checkmarks) + preview of a printable QR card.
  Button « Terminer » → confetti micro-animation + redirect to dashboard.

Progress bar at top in green. Each step keeps the global brand style.

---

## ÉCRAN 4 — DASHBOARD (accueil connecté — écran clé)

Design the main dashboard for an agency manager (role CHEF_AGENCE / DIRECTION).

**Topbar:** sidebar toggle, search bar « Rechercher un guichet, agent, avis… »,
period selector (dropdown: 24h / 7j / 30j), notification bell with red badge,
avatar menu.

**Sidebar (desktop) / bottom nav (mobile):** Dashboard (active), Guichets,
Planning, Avis clients, Questions & Critères, Alertes & Tâches, Archives,
Paramètres. Green active indicator on the left edge.

**Content:**
1. **Greeting row**: « Bonjour Ivo 👋 » + subtitle « Voici la satisfaction de
   l'Agence Centrale » + button « Exporter XLSX » (outline) .
2. **KPI cards row** (4 stat cards, each with icon, big number, delta chip ▲▼ colored):
   - Satisfaction (CSAT %) — ex. « 78% » ▲ +5%
   - Note moyenne (/5) — ex. « 3.8 »
   - Avis reçus (période) — ex. « 124 »
   - Alertes ouvertes — ex. « 3 » (red accent if > 0)
3. **Charts row** (2 columns):
   - Area chart « Tendance mensuelle » score /5 with a caption line above:
     « ↗ En hausse de 0.4 pt ce mois-ci (32 avis) » and dots colored
     green ≥4, yellow ≥3, red <3.
   - Bar chart « Répartition des notes » (1★→5★) with semantic colors
     red/orange/yellow/light-green/green.
4. **Objectifs section**: card list « Objectifs — cible vs réalisé ». Each row:
   criterion label + (nb avis), right side « 72% / 80% cible (-8) » colored
   green/red, horizontal progress bar with a vertical target marker line,
   status chip ATTEINT (green) / EN RETARD (red) / PAS DE DONNÉES (gray).
5. **Actions prioritaires**: compact list of alerts needing action, each with
   severity dot, guichet name, time ago, and two quick actions ✓ Traiter / → Tâche.
6. **Thèmes IA récurrents**: horizontal chips with counts: Temps d'attente (14),
   Accueil (9), Propreté (4)… sized by frequency.
7. **Accordion « Analyses détaillées »** containing: radar chart « Maturité du
   pilotage », horizontal bar charts « Classement des guichets » (worst→best)
   and « Scores par agent », heatmap « Affluence par jour & heure » (7×24 grid,
   green intensity).

Show realistic sample data everywhere. Empty-state variant needed: friendly
illustration + « Aucun avis pour cette période » + CTA « Partager vos QR codes ».

---

## ÉCRAN 5 — GESTION DES GUICHETS

Design the « Guichets » management page.

**Header:** title « Guichets » + count badge, search input, filter dropdown by
service, primary button « + Nouveau guichet ».

**Content:** grid of guichet cards. Each card: guichet name (ex. « CAISSE 1 »),
type tag, assigned services chips, today's assigned agent avatar+name with time
slot (08:00–17:00), live CSAT mini-badge (ex. 82% green / 54% red), status dot
(actif/inactif), kebab menu (Modifier, Kit QR, Archiver).

**Modal « Nouveau guichet »:** fields Nom, Type (select), Services (multi-select
chips), toggle « Activer immédiatement ». Note under form: « Le chef d'agence
n'est jamais affecté automatiquement à un guichet. » Buttons Annuler / Créer.

**Kit QR drawer/page:** printable A5 card preview: Yéba header, QR code centered,
« Scannez pour donner votre avis », guichet name, format selector (A5/A6/business
card), download PDF/PNG buttons, print button.

**Assignment flow:** modal « Affecter un agent » listing AGENT-role users only
(chef d'agence excluded, with helper text explaining it), date picker, time range
pickers, confirm button.

---

## ÉCRAN 6 — PLANNING DES AFFECTATIONS

Design the « Planning » page (daily assignments).

**Header:** date navigation ‹ Aujourd'hui › with date picker, view toggle
(Jour/Semaine), button « + Affectation ».

**Content (day view):** timeline from 07:00 to 19:00. Columns = guichets.
Each assignment is a colored block (green shades) with agent avatar, name,
time range. Drag-to-move affordance. Unassigned agents listed in a right rail
« Disponibles aujourd'hui » as draggable chips.

**Conflict states:** overlapping assignment shows warning border + tooltip
« Conflit : agent déjà affecté sur CAISSE 2 ».

Mobile: stacked list per guichet instead of grid.

---

## ÉCRAN 7 — PAGE DE COLLECTE CLIENT (scan QR — PUBLIC, mobile-first)

THIS IS THE MOST IMPORTANT SCREEN: what a customer sees after scanning the QR
code. Mobile-only design, must be beautiful, fast and effortless. Light background,
big touch targets, zero clutter. Show the guichet name subtly at top with the
Yéba logo. Progress bar (thin, green) showing question x/n.

**Flow states to design:**
1. **Service select** (only if >1 service): « Vous êtes venu pour… » large tappable
   cards with icons (💰 Épargne/Dépôt, 💳 Retrait…). Auto-skip if only one service.
2. **Question — SMILEY**: « Temps d'attente » label, helper text, 5 giant emoji
   buttons 😡😟😐🙂🤩 (scale on tap, selected gets ring highlight + slight bounce).
3. **Question — OUI/NON**: two big cards 👍 Oui / 👎 Non.
4. **Question — ÉCHELLE**: slider 1-10 or number pills.
5. **Question — CHOIX UNIQUE**: radio-style list; CHOIX MULTIPLE: checkboxes;
   CASES: checkbox chips; TEXTE: textarea « Votre commentaire (optionnel) ».
6. **Comment step**: « Un mot pour nous aider ? » optional textarea + optional
   phone field « Recevoir un suivi par SMS (+225…) » with consent note
   « Votre numéro est chiffré et jamais partagé ». Button « Envoyer mon avis ».
7. **SUCCESS**: confetti burst, big animated green check, message
   « Merci pour votre retour ! ❤️ », subtext if score ≥4 « Ravi de vous avoir
   satisfait », auto-reset hint. Trust footer: 🔒 Anonyme · ⚡ 30 secondes.
8. **Error/unavailable state**: card « Questionnaire momentanément indisponible »
   + « Contactez l'accueil » (for archived/inactive guichet or no criteria).

Back arrow to previous question. Answers are never mandatory except flagged ones.

---

## ÉCRAN 8 — AVIS CLIENTS (liste + détail)

Design the « Avis clients » page.

**Filters bar:** date range, guichet select, service select, sentiment filter
chips (Tous / Positif 🟢 / Neutre 🟡 / Négatif 🔴 / Mixte), rating stars filter,
search. Button « Exporter XLSX ».

**List:** grouped by submission (one client review may contain several answers).
Card layout: client avatar placeholder (initials), date/time, guichet + service
tags, star row per criterion, comment in italic with quotation styling, and an
**AI analysis badge block**: sentiment chip (POSITIVE/NEGATIVE/MIXED colored),
urgency chip (LOW→CRITICAL with color escalation), theme tags, and a one-line
AI summary. Expandable to show all individual answers.

**Detail drawer:** full submission, phone contact button if provided (masked
+22X XX XX XX XX 34), « Créer une tâche corrective » button when negative.

Empty state and skeleton loading variants.

---

## ÉCRAN 9 — QUESTIONS & CRITÈRES (éditeur Kanban drag-and-drop)

Design the « Configuration des critères » page with a Kanban editor.

**Header:** agency selector (if DIRECTION), button « + Créer un critère à la carte ».

**Kanban board:** horizontal scrollable columns. First column pinned:
« Non assignées » (question bank, inbox icon). Then one column per service
(« Accueil », « Épargne/Dépôt »…). Each column header: name, count badge, "+" add
button.

**Question card:** grip handle, question label, type badge (⭐ Note, 👍 Oui/Non,
📝 QCM, ✍️ Texte, 🔢 Échelle, ☑️ Cases), obligatoire asterisk if required, kebab
menu: Modifier / Dupliquer / Supprimer / Déplacer vers (submenu listing columns —
accessibility fallback to drag).

**Drag interaction state:** card lifted with shadow, destination column highlighted
with subtle green tint, insertion indicator line.

**Modals:** Create (label textarea, type select, options builder for QCM/cases —
dynamic option rows with add/remove, obligatoire toggle). Edit modal (same, prefilled).
Delete confirmation AlertDialog with warning about existing responses
(« Cette question a reçu 23 réponses : elle sera désactivée, pas supprimée » if blocked).

**Below the board:** ObjectifsPanel — per active criterion: current objective bar
with target marker, inline editors Cible % / Début / Fin, save + delete buttons,
status chips À venir/Actif/Expiré.

---

## ÉCRAN 10 — ALERTES & TÂCHES CORRECTIVES

Design the « Alertes & Tâches » page with two tabs.

**Tab Alertes:** list of alert cards: severity stripe (red critical / orange high /
yellow medium), trigger reason (« Score 1★ sur Temps d'attente »), guichet + agent,
time ago, actions: « Marquer traitée » (✓) and « Créer une tâche » . Filter chips
by severity and status. Real-time feel: subtle pulse dot on new alerts.

**Tab Tâches correctives:** Kanban (À faire / En cours / Terminé) OR list with
status selects. Task card: title linked to its alert, responsable avatar,
due-date chip (red if overdue), history expandable (created → started → done
timeline). Modal « Nouvelle tâche »: titre, description, échéance date picker,
responsable select (agents list).

---

## ÉCRAN 11 — ADMIN PERSONNEL

Design the « Personnel » admin page (DIRECTION only).

**Header:** « Personnel », role filter tabs (Agents / Chefs d'agence / Invitations),
search, « + Inviter » button.

**Table/cards:** avatar, nom complet, email, rôle badge (AGENT gray /
CHEF_AGENCE green / DIRECTION purple), statut (actif/suspendu), performance mini
sparkline or avg score, last activity. Row actions kebab: Modifier, Promouvoir,
Suspendre, Réactiver, Supprimer (with typed confirmation).

**Invite modal:** email + role select + agence select; explains the agent will
receive a setup link. Pending invitations section with resend/revoke.

---

## ÉCRAN 12 — PARAMÈTRES

Design the « Paramètres » page, sections as settings cards:

1. **Entreprise**: logo upload (drag zone), name, edit form.
2. **Agence**: name, ville, téléphone.
3. **Apparence**: theme selector (Clair ☀️ default / Sombre 🌙) as two preview
   tiles, accent preview swatches green/yellow.
4. **Statut IA**: status card — provider name + model in mono chip
   (ex. « OpenRouter · nvidia/nemotron-3.5-lightning:free »), configured state
   « Opérationnel » green vs « Clé manquante » warning; volumetry « 42/50 avis
   analysés, 2 échecs »; collapsible admin guide showing env var names
   (OPENROUTER_API_KEY masked sk-or-…) in code blocks.
5. **Notifications**: toggles (alerte SMS au chef, email hebdo, rapport mensuel).
6. **Abonnement**: plan card Starter/Pro with usage bars, upgrade CTA.
7. **Zone dangereuse** (destructive): export complet des données, archivage.

Left anchor-nav on desktop, stacked accordion on mobile.

---

## ÉCRAN 13 — ARCHIVES

Design the « Archives » page: tabbed (Guichets / Agences / Alertes / Tâches /
Critères). Each tab: simple searchable table with archived date, archive reason,
and restore (↩ Désarchiver) primary action + permanent-delete destructive ghost
action where allowed. Soft gray styling on archived rows. Confirmation dialogs
for both restore and delete.

---

## ÉCRANS SYSTÈME (bonus, rapides)

- **404**: playful empty state « Ce guichet s'est égaré » + button home.
- **Loading skeletons** for every page (match layouts above).
- **Toast/snackbar** styles: success green, error red, info neutral — bottom center mobile, bottom right desktop.
- **Notification dropdown**: grouped Aujourd'hui/Cette semaine, unread dot, mark-all-read.

---

## CHECKLIST COHÉRENCE (à vérifier sur chaque écran généré)

- [ ] Vert #00A651 = seule couleur d'action primaire ; jaune = accent uniquement.
- [ ] Rayons 16-24px, ombres douces, aucun glassmorphism/gradient de fond.
- [ ] Typo bold mais jamais black ; tailles hiérarchisées.
- [ ] Tous les libellés en FRANÇAIS.
- [ ] États vides + loading prévus.
- [ ] Version mobile systématiquement demandée (« show mobile variant too »).
