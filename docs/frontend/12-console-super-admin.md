# YEBA PLATFORM — Console Super Admin
## Doc 12 — Écrans, wizard de création d'entreprise, email d'activation, onboarding

> **Prérequis** : Doc 11 (architecture SaaS, `platformRole`, statut entreprise, `Invitation`, `AuditLog`).
> **Design** : Doc 03 (grammaire Mint) + ds/ existant. La console est **plus dense et plus sobre** que l'espace client mais reste clairement Yeba (Satoshi, vert/jaune avec parcimonie, cartes arrondies, icônes Lucide).
> **Routes** : préfixe `/platform/*`, garde serveur `requirePlatformRole(['SUPER_ADMIN','SUPPORT'])` sur chaque query/action, garde front dans `PlatformShell`.

---

## 1. Structure des écrans

| Route | Page | Contenu |
|---|---|---|
| `/platform` | PlatformOverviewPage | KPI globaux + entreprises récentes |
| `/platform/entreprises` | CompaniesPage | Liste filtrable/recherchable |
| `/platform/entreprises/:id` | CompanyDetailsPage | Détail + actions (suspendre/réactiver/limites) |
| `/platform/entreprises/nouvelle` | CreateCompanyPage | Wizard 4 étapes |
| `/platform/audit` | AuditLogsPage | Journal filtrable |
| `/platform/securite` | SecurityPage | Invitations actives, sessions, 2FA (Phase 3) |

Composants : `src/client/platform/PlatformShell.tsx` + `pages/` + `components/` (CompanyCard, StatTile, StatusChip, PlanChip, WizardSteps).

## 2. PlatformShell

```
┌──────────────────────────────────────────────────────────┐
│ ⬢ YEBA PLATFORM                        Admin ▼  [Déconnexion] │
├──────────────┬───────────────────────────────────────────┤
│ Overview     │                                           │
│ Entreprises  │            <Outlet/>                      │
│ Audit        │                                           │
│ Sécurité     │                                           │
│              │                                           │
│ ———          │                                           │
│ Retour app   │                                           │
└──────────────┴───────────────────────────────────────────┘
```

- Sidebar **sombre** (fond `hsl(216 40% 12%)`, le noir institutionnel Mint) pour distinguer immédiatement de la sidebar claire entreprise.
- Pas de CommandPalette, pas d'OnboardingTour, pas de notifications métier.
- Header : « YEBA PLATFORM » + chip « SUPER_ADMIN » ; badge SUPPORT si `platformRole==='SUPPORT'` (lecture seule → tous les boutons d'action `disabled` + masqués).
- Mobile : drawer latéral identique à la sidebar (pas d'invention).

## 3. PlatformOverviewPage (`/platform`)

- **Bonjour, Administrateur** + date du jour.
- **4 StatTiles** (composant ds/Stat existant) : Entreprises totales · Actives · Utilisateurs · Avis collectés (compteurs seulement — jamais de verbatim).
- **Graphique « Évolution des entreprises »** (créations/mois, 12 mois — recharts existant, BarChart simple).
- **Entreprises récentes** : 5 dernières (CompanyCard compact) + lien « Voir toutes ».
- Query `getPlatformOverview` : `groupBy` sur Entreprise + `count()` User/Reponse (agrégats purs).

## 4. CompaniesPage (`/platform/entreprises`)

**Layout** : header (titre + sous-titre + bouton `+ Nouvelle entreprise`) puis barre d'outils (recherche debounce 300 ms, filtre Statut ▼, filtre Plan ▼) puis liste de **CompanyCard** (pas un tableau Bootstrap) :

```
┌──────────────────────────────────────────────────────┐
│ 🏢 La Poste de Côte d'Ivoire        [ACTIVE] [BUSINESS]│
│    direction@laposte.ci                              │
│    24 agences · 148 utilisateurs · 18 492 avis       │
│    Créée le 12 mai 2026                    Ouvrir →  │
└──────────────────────────────────────────────────────┘
```

- StatusChip : ACTIVE (vert), TRIAL (info), SUSPENDED (destructive, point d'exclamation), CANCELLED (gris).
- Hover lift Mint (`hover-lift`), clic → CompanyDetailsPage.
- Mobile (<640px) : cartes empilées, la barre d'outils se replie en bouton filtre.
- **Pagination** « Charger plus » (cursor sur `id`, page de 20) — pas de scroll infini.
- Query `getPlatformEntreprises({ search?, status?, plan?, cursor? })` : `select` nom, nom_court, email_administratif, status, plan, date_creation + `_count` agences/utilisateurs. Recherche `contains, mode: 'insensitive'` sur nom/nom_court/email.

## 5. CompanyDetailsPage (`/platform/entreprises/:id`)

- Header : `← Entreprises` + nom + chips statut/plan + actions (`Suspendre`/`Réactiver` selon statut, `Modifier les limites`, `Renvoyer l'invitation` si admin jamais activé).
- **Bande de 3 StatTiles** : Agences (x/limite) · Utilisateurs (x/limite) · Avis collectés.
- **Informations** (Card) : admin principal (nom, email, badge « jamais activé » si pas de login), créée le, plan, statut, dates d'abonnement.
- **Alerte si limite atteinte** : « 50/50 agences — le plan Business est saturé » (chip warning).
- **Suspendre** → modale de confirmation (ds dialog) avec **motif obligatoire** (textarea) → action `suspendreEntreprise` (journalisée) → tous les comptes de cette entreprise reçoivent 403 immédiatement (statut vérifié dans requireAuth — Doc 11 §3.4).
- **Activité récente** : 10 derniers AuditLog de cette entreprise (`entreprise_id`, desc) — acteur, action, date. Lien « Voir tout » vers /platform/audit pré-filtré.
- **Sécurité** : cette page n'expose AUCUN avis client (Doc 11 §7).

## 6. CreateCompanyPage — le wizard 4 étapes

Wizard plein écran (max-w-2xl centré), stepper horizontal `01 Entreprise — 02 Admin — 03 Plan — 04 Confirmation`, transitions framer-motion opacity/x 0.25s (identité Yeba conservée — la contrainte perf ne concerne QUE /q/*).

**État local** : un seul objet `draft` en useState ; aucune requête serveur avant l'étape 4 (l'aperçu couleur est local).

### Étape 1 — Entreprise
Champs : `nom_entreprise`* · `nom_court` · `email_administratif`* (validation zod email) · `telephone` · `pays` (défaut Côte d'Ivoire).

### Étape 2 — Administrateur principal
`prenom`* · `nom`* · `email`* (par défaut = email administratif, modifiable) · `telephone`.
Note info : « Un email d'activation lui sera envoyé automatiquement. Aucun mot de passe n'est transmis par email. »

### Étape 3 — Plan
3 PlanCards radio (Starter/Business/Enterprise) avec limites affichées ; sélection → limite pré-remplie (modifiable) : `limite_agences`, `limite_utilisateurs`, `limite_guichets`.

### Étape 4 — Confirmation
Récapitulatif complet (entreprise, admin, plan+limites) + checklist de ce qui sera créé :
```
✓ Entreprise créée (statut ACTIVE)
✓ Compte administrateur (DIRECTION)
✓ Invitation sécurisée (expire dans 24 h)
✓ Email d'activation envoyé
✓ Action journalisée (AuditLog)
```
Bouton `Créer l'entreprise` → loader → écran de succès animé (confetti léger optionnel) avec les 4 checks apparaissant séquentiellement + boutons `Voir l'entreprise` / `Créer une autre`.

### Action serveur `creerEntreprise` (transaction)

```ts
requirePlatformRole(context, ['SUPER_ADMIN']);
// zod schema stricte sur args
await prisma.$transaction(async (tx) => {
  // 1. unicité email
  if (await tx.user.findUnique({ where: { email: args.admin.email } }))
    throw new HttpError(409, 'Un utilisateur utilise déjà cette adresse.');
  // 2. Entreprise
  const entreprise = await tx.entreprise.create({ data: { ..., status: 'ACTIVE', plan, ...limites } });
  // 3. Compte admin DIRECTION — identité auth créée SANS mot de passe utilisable
  //    (hashedPassword aléatoire 32 octets, jamais transmis)
  const user = await createUser(providerId, providerData, { ..., role: 'DIRECTION', id_entreprise: entreprise.id, actif: true, mustChangePassword: true });
  // 4. Invitation
  const tokenClair = crypto.randomBytes(32).toString('base64url');
  await tx.invitation.create({ data: { id_user: user.id, id_entreprise: entreprise.id, token_hash: sha256(tokenClair), expires_at: +24h, invited_by: context.user.id } });
  // 5. Audit
  await tx.auditLog.create({ data: { actor_id: context.user.id, action: 'entreprise.create', resource: 'Entreprise', resource_id: String(entreprise.id), entreprise_id: entreprise.id, details: { plan, nom: args.nom } } });
  // 6. Email (dans la transaction ou juste après — le mail part même si le
  //    reste a réussi ; en cas d'échec SMTP, bouton « Renvoyer l'invitation »)
});
// Retour : { id_entreprise, email_invitation: tokenClair intégré au lien } — le
// lien est généré côté serveur : `${WASP_WEB_CLIENT_URL}/account/activate?token=${tokenClair}`
```

## 7. Email d'activation + page d'activation

### 7.1 Email (reprend le gabarit HTML riche de `inviteAgent` — en-tête dégradé, cartes, étapes)

- Objet : `🎉 Bienvenue sur Yeba — Votre espace est prêt`
- Contenu : nom entreprise, rôle « Administrateur principal », email du compte, **bouton `ACTIVER MON COMPTE`** → `/account/activate?token=...`, mention « Ce lien est personnel, à usage unique, et expire dans 24 heures. »
- **Aucun mot de passe, même temporaire, dans l'email.**

### 7.2 Page `/account/activate`

- Route publique (pas de navbar), carte centrée max-w-md sur AmbientBackground.
- États : (a) token valide → formulaire « Créer votre mot de passe » (×2 champs, zod min 8) ; (b) token expiré/utilisé → message + bouton « Demander un nouveau lien » ; (c) succès → « ✓ Compte activé » + redirection `/login`.
- Action `activerCompte({ token, motDePasse })` : vérifie hash/expiration/usage → pose le mot de passe (Wasp `updateUserProfileAttributes`/auth identity) → `used_at=now` → `mustChangePassword=false` → AuditLog `invitation.used` → **transaction**.

## 8. Onboarding entreprise (première connexion DIRECTION)

Après activation et login, si l'entreprise n'a **aucune agence**, redirect vers `/onboarding` (garde : query `getMesEntreprises` vide côté agences).

Stepper 3 étapes (composant WizardSteps partagé avec le wizard platform) :
1. **Première agence** (nom, commune, adresse) → `creerAgence` (bypass des limites : comptée).
2. **Premier guichet** (nom, service) → `creerGuichet`.
3. **Votre premier QR** → réutilise le composant d'aperçu du KitGuichet existant (PNG A4/A5/carte, télécharger/imprimer) + bouton `Aller au dashboard`.

Règles : chaque étape est skippable (onboarding non bloquant — indicateur dans la sidebar tant que incomplet) ; tout est journalisé (`onboarding.step_done`).

## 9. Shells front — normalisation

```
src/client/
├── App.tsx                  (routing + garde /platform/*)
├── public/                  (CollectePage — existe)
├── enterprise/              (pages actuelles migrées progressivement)
│   └── EnterpriseShell.tsx  (encapsule Sidebar/NavBar/Onboarding actuels)
├── platform/
│   ├── PlatformShell.tsx
│   ├── pages/ (PlatformOverview, Companies, CompanyDetails, CreateCompany, AuditLogs, Security)
│   └── components/ (CompanyCard, StatusChip, PlanChip, StatTile, WizardSteps, ConfirmDialog)
└── components/ds/           (design system partagé — inchangé)
```

- Garde front : `PlatformShell` vérifie `platformRole` via `useAuth` + redirect `/login` si absent — **rappel : la vraie sécurité reste le middleware serveur** (le front n'est jamais la protection).
- Garde serveur : chaque query/action platform commence par `requirePlatformRole(context, [...])`.
- `main.wasp.ts` : routes `PlatformRoute /platform` (+ enfants) avec `authRequired: true` ; les pages platform n'apparaissent pas dans la sidebar entreprise.

## 10. Checklist d'acceptation (console platform)

1. Un DIRECTION de l'entreprise A qui forge `GET /platform/entreprises` via l'API reçoit **403** (requirePlatformRole).
2. Après `suspendreEntreprise(A)`, un login DIRECTION de A → **403 suspension** ; réactivation → accès restauré sans perte de données.
3. L'email d'activation ne contient **aucun** mot de passe ; le lien expire à 24 h et est inutilisable une seconde fois.
4. Chaque création/suspension/limites apparaît dans /platform/audit avec acteur+IP+horodatage.
5. Créer une agence au-delà de la limite → **403 serveur** avec message de plan (même si le front est patché).
6. Le wizard ne crée RIEN avant le clic final ; un abandon à l'étape 3 ne laisse aucun résidu en base.
7. `tsc --noEmit` sans erreur ; pages vérifiées à 375px et 1280px.
