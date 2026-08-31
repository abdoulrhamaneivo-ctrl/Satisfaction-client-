# YEBA PLATFORM — Architecture SaaS multi-entreprises
## Doc 11 — Vision, modèle mental, rôles plateforme et sécurité SaaS

> **Statut** : SPÉCIFICATION DE RÉFÉRENCE (à implémenter en phases).
> **Contexte** : Yeba est aujourd'hui un outil interne mono-entreprise (déploiement mono-agence, cf. AGENTS.md). Cette doc définit l'évolution vers une **plateforme SaaS multi-entreprises** : Super Admin Yeba crée des entreprises clientes, chaque entreprise est isolée (données, branding), avec console dédiée et onboarding guidé.
> **Prérequis à lire** : `docs/PLATEFORME.md` (architecture métier réelle), `docs/frontend/00-INDEX.md` (écarts E1-E7).

---

## 1. Modèle mental cible

```
                       YEBA PLATFORM (éditeur)
                              │
                    ┌─────────┴─────────┐
                    │                   │
              SUPER ADMIN          SaaS Core
             (console dédiée)      Entreprises · Plans · Audit · Branding
                    │
     ┌──────────────┼──────────────┐
     │              │              │
 Entreprise A   Entreprise B   Entreprise C     ← TENANTS (isolés)
     │
 ┌───┴────┐
 │        │
DIRECTION
 ├── QUALITE          ← portée entreprise
 ├── CHEF_AGENCE      ← portée agence
 │    └── AGENT       ← terrain, sans compte (ou compte limité)
```

**3 niveaux d'administration** (jamais mélangés) :

| Niveau | Qui | Console | Portée |
|---|---|---|---|
| **1. Platform** | Éditeur Yeba (nous) | `/platform/*` — UI distincte | Toutes les entreprises (méta-données, jamais les avis bruts des clients) |
| **2. Entreprise** | DIRECTION / QUALITE du client | `/dashboard` + sidebar actuelle | Toutes les agences de **son** entreprise uniquement |
| **3. Agence** | CHEF_AGENCE / AGENT | Idem, vue filtrée | **Son** agence uniquement |

**Règle d'or SaaS** : le Super Admin gère la **relation commerciale et technique** (création, suspension, plan, limites, branding autorisé) — il ne consulte JAMAIS les avis clients ni les données RH d'une entreprise (voir §7 Confidentialité platform).

## 2. État réel du code (audit 2026-08-31) — déjà acquis vs à construire

### ✅ Déjà solide (on conserve)
- `Entreprise`, `Agence`, `User.id_entreprise`, `User.id_agence` en base (schema.prisma).
- **RLS canonique** `src/server/middleware/rowLevelSecurity.ts` :
  - `requireAuth()` (401 non connecté, 403 suspendu),
  - `requireRole(['DIRECTION', …])` (403 sinon),
  - `requireManagementRole()`,
  - `buildAgenceFilter()` — DIRECTION/QUALITE → `{ id_agence: { in: [...leur entreprise] } }`, autres → leur agence,
  - `assertAgenceAccess(context, entities, recordIdAgence)` — **403 si la ressource sort du tenant, même avec un ID forgé**,
  - `resolveAgenceScope()`/`resolveAgenceId()` pour les opérations de gestion.
- Job cron PgBoss opérationnels, alertes, IA async (`AnalyseAvisIA.status='PENDING'` → job).
- Upload S3 prêt (`src/file-upload/` : types MIME contrôlés, taille max, URLs pré-signées) → servira l'upload de logos.
- Isolation avis vérifiée en prod (`GET /avis` filtré par agence/entreprise côté serveur).

### 🔴 À construire (le cœur de cette spec)
1. **`platformRole` distinct du rôle métier** (`isAdmin` booléen trop générique) — §3.
2. **Modèle SaaS sur Entreprise** : `status` (TRIAL/ACTIVE/SUSPENDED/CANCELLED), `plan`, `date_debut_abonnement`, limites (`limite_agences`, `limite_utilisateurs`, `limite_guichets`) — §4.
3. **Modèle `BrandingConfig`** par entreprise (logo, couleurs, messages QR) — Doc 13.
4. **Workflow de création d'entreprise** : action `creerEntreprise` (Super Admin) + **invitation sécurisée par token** (jamais de mot de passe dans l'email) — §5 + Doc 12.
5. **Console Platform** `/platform/*` : Overview, Entreprises, Détail entreprise, Création (wizard 4 étapes), Audit, Sécurité — Doc 12.
6. **AuditLog** systématique sur les actions sensibles — §8.
7. **Shells front séparés** : `PublicShell` (/q), `EnterpriseShell` (app), `PlatformShell` (/platform) — Doc 12 §9.
8. **Onboarding entreprise** après activation (première agence → guichet → QR) — Doc 12 §8.

### ⚠️ À corriger en passant
- `userSignupFields.ts` : `isAdmin: isAdminEmail(ADMIN_EMAILS)` — une liste d'emails de config ne doit **pas** décider du statut Super Admin. Remplacé par `platformRole` attribué côté serveur (voir §3.3).
- `onAuthFailedRedirectTo: "/login"` : ok. Mais ajouter une garde `/platform/*` dédiée (middleware `requirePlatformRole`).
- `BrandContext` : `BRANDING` est une constante globale figée (`src/shared/branding.ts`). À remplacer par la config par entreprise (Doc 13) **sans casser** l'API `useBrand()` (le contexte garde la même forme, la source change).

## 3. Rôles — `platformRole` vs `role` métier

### 3.1 Modèle final

```
User
├── platformRole : SUPER_ADMIN | SUPPORT | NONE      (défaut NONE)
├── id_entreprise : Int?        (null pour SUPER_ADMIN/SUPPORT)
├── role : DIRECTION | QUALITE | CHEF_AGENCE | AGENT   (null pour plateforme)
└── id_agence : Int?            (null pour DIRECTION/QUALITE/plateforme)
```

- **SUPER_ADMIN** : `platformRole='SUPER_ADMIN'`, `id_entreprise=null`, `role=null`, `id_agence=null`.
- **Client DIRECTION** : `platformRole='NONE'`, `id_entreprise=12`, `role='DIRECTION'`, `id_agence=null`.
- **Client CHEF_AGENCE** : `platformRole='NONE'`, `id_entreprise=12`, `role='CHEF_AGENCE'`, `id_agence=38`.

### 3.2 Middleware — nouvelle fonction canonique

Ajouter à `rowLevelSecurity.ts` (le fichier reste LE module de permissions — cf. AGENTS.md) :

```ts
export type PlatformRole = 'SUPER_ADMIN' | 'SUPPORT' | 'NONE';

export function requirePlatformRole(context, roles: PlatformRole[]): void {
  requireAuth(context);
  const pr = context.user.platformRole ?? 'NONE';
  if (!roles.includes(pr)) {
    throw new HttpError(403, 'Accès réservé à la console Yeba Platform.');
  }
}
```

**Règles de coercition** (importantes) :
- `requirePlatformRole(['SUPER_ADMIN'])` **remplace** `requireAdmin()` partout où il s'agit du SaaS (l'ancien `isAdmin` reste pour la page technique Wasp `/admin` pendant la transition, puis disparaît).
- Un SUPER_ADMIN **sans** `id_entreprise` ne passe JAMAIS par `buildAgenceFilter` : toute query entreprise de la console platform est écrite séparément (agrégats `groupBy`), avec `requirePlatformRole`.
- SUPPORT : lecture seule sur les méta-données d'entreprises (jamais d'écriture, jamais d'avis).

### 3.3 Attribution du SUPER_ADMIN — procédure sécurisée

- **À l'installation** : le premier SUPER_ADMIN est créé par le **seed** (`dbSeeds.ts`) avec un mot de passe à changer à la première connexion (pattern déjà en place pour le CHEF_AGENCE). Le seed vérifie : si un SUPER_ADMIN existe déjà, il n'en crée pas de second.
- **Ensuite** : un SUPER_ADMIN existant crée les suivants **depuis la console** (action `inviterSuperAdmin`), même mécanisme d'invitation tokenisé que les entreprises. `ADMIN_EMAILS` ne crée plus de SUPER_ADMIN.
- `userSignupFields.ts` : `isAdmin` supprimé des signup fields ; `platformRole='NONE'` par défaut sur TOUT compte créé par invitation normale. Un compte de plateforme ne peut naître que d'une invitation SUPER_ADMIN.

### 3.4 Hiérarchie des protections (chaque requête sensible suit ce chemin)

```
AUTHENTIFICATION (requireAuth)
      ↓
PLATFORM ROLE ? (requirePlatformRole si route /platform)
      ↓
COMPTE ACTIF + ENTREPRISE ACTIVE ? (entreprise.status === 'ACTIVE' — nouveau §4)
      ↓
ENTREPRISE ? (id_entreprise du compte = id_entreprise de la ressource)
      ↓
AGENCE ? (assertAgenceAccess)
      ↓
RESSOURCE + ACTION AUTORISÉE ? (requireRole + règles métier)
```

La vérification **entreprise ACTIVE** s'ajoute dans `requireAuth` : si l'entreprise du compte est SUSPENDED/CANCELLED → 403 « Votre abonnement Yeba est suspendu. Contactez votre gestionnaire. » (Coût : 1 requête `Entreprise` en cache par requête, ou jointure dans le token — décision §4.2.)

## 4. Le tenant « Entreprise » — statut, plan, limites

### 4.1 Schéma cible (migration Prisma)

```prisma
model Entreprise {
  id                   Int      @id @default(autoincrement())
  nom_entreprise       String
  nom_court            String?                  // « La Poste CI » (affichage compact)
  email_administratif  String?
  telephone            String?
  pays                 String?  @default("Côte d'Ivoire")
  date_creation_compte DateTime @default(now())

  // ── SaaS ──
  status               String   @default("TRIAL")  // TRIAL | ACTIVE | SUSPENDED | CANCELLED
  plan                 String   @default("STARTER") // STARTER | BUSINESS | ENTERPRISE
  date_debut_abonnement DateTime?
  date_fin_abonnement  DateTime?                  // null = reconduction
  limite_agences       Int      @default(5)
  limite_utilisateurs  Int      @default(50)
  limite_guichets      Int      @default(25)
  suspendue_le         DateTime?
  motif_suspension     String?

  // ── Branding (détail Doc 13) ──
  branding             BrandingConfig?

  agences        Agence[]
  utilisateurs   User[]
  criteres       Critere[]
  services       Service[]
  auditLogs      AuditLog[]
}
```

**Plans (tableau de référence — constant côté code, pas une table au début)** :

| Plan | Agences | Utilisateurs | Guichets | Branding |
|---|---|---|---|---|
| STARTER | 5 | 50 | 25 | Logo + couleur primaire + messages |
| BUSINESS | 50 | 500 | 200 | + charte complète + QR Designer |
| ENTERPRISE | illimité | illimité | illimité | + modèles QR avancés + PDF/SVG + suppression « Propulsé par Yeba » |

Les limites sont **vérifiées côté serveur** dans les actions de création (`creerAgence`, `inviteAgent`, `creerGuichet`) : « Limite du plan atteinte (50 agences). Passez au plan Enterprise ou contactez Yeba. » Le front affiche l'erreur, le serveur est la seule vérité.

### 4.2 Vérification du statut — implementation note

`requireAuth` charge-t-il l'Entreprise à chaque appel ? Non — coût inutile. Deux options :
- **Option retenue (simple)** : `requireAuth` fait un `findUnique` sur Entreprise **seulement pour les rôles métier** (`id_entreprise != null`), champ `status` uniquement (`select: { status: true }` → requête PK, ~0.1 ms). Un cache mémoire 60 s par id_entreprise évite même ça (Map locale au process).
- Les comptes plateforme (`id_entreprise === null`) ne passent jamais par cette vérification.

Suspension = `status='SUSPENDED'` + `suspendue_le` + `motif_suspension`. Réactivation = retour ACTIVE (les données n'ont jamais été supprimées — archivage logique partout).

## 5. Workflow de création d'entreprise (le cœur du SaaS)

### 5.1 Séquence complète

```
SUPER ADMIN (console /platform)
   ↓ wizard 4 étapes (Doc 12)
Action creerEntreprise (TRANSACTION Prisma)
   ├─ Entreprise.create        (status=ACTIVE, plan, limites)
   ├─ User.create              (DIRECTION, id_entreprise)
   ├─ Auth identity            (compte SANS mot de passe valide — voir 5.2)
   ├─ Invitation.create        (token_hash = SHA-256(token), expires +24h)
   ├─ AuditLog.create          (« SUPER_ADMIN a créé l'entreprise X »)
   └─ emailSender.send         (email d'activation — Doc 12 §7)
   ↓
DIRECTION reçoit l'email → bouton « Activer mon compte »
   ↓
Page /account/activate?token=... → définit son mot de passe
   ↓ (token : usage unique, expires_at vérifié, used_at posé)
Connexion → /onboarding (créer agence → guichet → QR)
   ↓
Dashboard entreprise
```

### 5.2 Modèle `Invitation` (usage unique, hash stocké)

```prisma
model Invitation {
  id             BigInt    @id @default(autoincrement())
  id_user        String    // User invité (cible)
  id_entreprise  Int
  token_hash     String    @unique  // SHA-256 du token en clair — le clair n'est JAMAIS stocké
  expires_at     DateTime           // +24 h
  used_at        DateTime?          // posé à l'activation (usage unique)
  created_at     DateTime  @default(now())
  invited_by     String    // id du SUPER_ADMIN émetteur

  @@index([id_user])
  @@index([expires_at])
}
```

- Le token en clair (32 octets base64url) va **uniquement** dans le lien de l'email : `/account/activate?token=<clair>`.
- À l'activation : `SHA-256(token_clair)` comparé à `token_hash`, `expires_at > now`, `used_at == null`. Puis `used_at = now` + définition du mot de passe dans la même transaction.
- Renvoi d'invitation = nouvelle Invitation (l'ancienne est invalidée par `used_at` ou expire seule).

### 5.3 Réutilisation du pattern `inviteAgent`

L'action `inviteAgent` (DIRECTION/CHEF_AGENCE → staff) crée déjà des comptes avec mot de passe temporaire aléatoire + email « définir mon mot de passe ». On **généralise** : même `Invitation` pour toutes les invitations (plateforme → entreprise → staff). Divergences assumées :
- Plateforme → DIRECTION : création de tenant complet (cette spec).
- DIRECTION → CHEF_AGENCE/QUALITE : compte pré-créé, invitation à définir le mot de passe (remplace l'actuel `request-password-reset` en lien nu).
- CHEF_AGENCE → AGENT : inchangé (agents sans email, pas de compte).

## 6. Front — 3 expériences, 3 shells

*(Détail complet des écrans dans Doc 12 ; cette section fixe l'architecture.)*

```
src/client/
├── public/          → /q/:guichetId (CollectePage — déjà optimisée perf, Doc 00 §4)
├── enterprise/      → shell actuel (Sidebar, Dashboard, Avis, Guichets…)
│   └── EnterpriseShell.tsx   (wrapper du shell existant, renommage progressif)
├── platform/        → NOUVEAU — /platform/*
│   ├── PlatformShell.tsx     (sidebar propre à la console)
│   └── pages/                (Overview, Entreprises, CompanyDetails, CreateCompany, Audit, Sécurité)
└── design-system/   → ds/ existant + composants partagés (DataTable, Badge, Modal)
```

**Règles de navigation** :
- `/platform/*` **jamais** lié depuis la sidebar entreprise — c'est une URL directe + une garde serveur.
- La sidebar entreprise détecte `platformRole==='SUPER_ADMIN'` pour afficher un discreet lien « Console Platform » (commodité, pas un droit : la vraie protection est le middleware).
- Pas d'admin « Bootstrap » : la console réutilise ds/ (Button, Card, Badge), Satoshi, vert/jaune — plus dense, plus sobre que l'espace client.

## 7. Confidentialité — ce que le Super Admin voit (et ne voit pas)

Principe prolongeant la confidentialité par niveaux (Doc 08) :

| Donnée | SUPER_ADMIN | DIRECTION client |
|---|---|---|
| Nom, plan, statut, limites, dates | ✅ | — |
| Nombre d'agences / utilisateurs / guichets | ✅ (compteurs) | ✅ |
| Volume d'avis collectés (chiffre) | ✅ | ✅ |
| **Contenu des avis / verbatims** | ❌ JAMAIS | ✅ (son entreprise) |
| **Coordonnées clients** | ❌ JAMAIS | ✅ (RG12-18) |
| **Branding** (lire) | ✅ | ✅ |
| **Branding** (écrire) | ❌ (sauf désactivation sur litige, journalisée) | ✅ (selon plan) |
| Noms des utilisateurs du staff | ✅ (nécessaire au support) | — |

L'interface Platform n'expose **aucun endpoint** renvoyant des verbatims : la protection est l'absence d'API, pas un masquage front.

## 8. AuditLog — journal des actions sensibles

```prisma
model AuditLog {
  id           BigInt   @id @default(autoincrement())
  actor_id     String   // User (ou 'system' pour les jobs)
  actor_role   String?  // SUPER_ADMIN, DIRECTION, ... (copie au moment du fait)
  action       String   // 'entreprise.create', 'entreprise.suspend', 'user.invite', 'branding.update', 'login.failed', ...
  resource     String   // 'Entreprise', 'User', 'Guichet', ...
  resource_id  String?
  entreprise_id Int?    // pour filtrer l'audit par tenant (l'audit platform est entreprise_id=null)
  details      Json?    // diff avant/après (sans secret), motif de suspension...
  ip           String?
  user_agent   String?
  created_at   DateTime @default(now())

  @@index([entreprise_id, created_at])
  @@index([actor_id, created_at])
  @@index([action, created_at])
}
```

**Actions journalisées obligatoirement** (liste minimale) :
- Platform : `entreprise.create`, `entreprise.suspend`, `entreprise.reactivate`, `entreprise.update_limits`, `invitation.create/revoke`, `superadmin.invite`.
- Entreprise : `user.invite`, `user.suspend`, `guichet.create/archive`, `agence.create/archive`, `branding.update`, `criteres.update`.
- Sécurité : `login.success/failed` (rate-limité en journalisation), `password.reset_requested/done`, `invitation.used/expired`.

Écriture via un helper unique (`journaliser(context, action, resource, ...)`), jamais dispersé. IP/user-agent tirés de `context.req` quand disponible.

## 9. Sécurité — checklist SaaS minimale (implémentation progressive)

| # | Mesure | Statut |
|---|---|---|
| S1 | RLS serveur sur toutes les opérations (assertAgenceAccess / buildAgenceFilter) | ✅ acquis |
| S2 | `platformRole` + `requirePlatformRole` sur /platform | Phase 1 |
| S3 | Statut entreprise vérifié dans requireAuth (suspension = blocage global) | Phase 1 |
| S4 | Invitations tokenisées usage unique + expiration (SHA-256 stocké) | Phase 1 |
| S5 | Jamais de mot de passe en clair par email (activation + reset) | Phase 1 |
| S6 | AuditLog sur actions sensibles | Phase 1 |
| S7 | Limites de plan vérifiées côté serveur | Phase 2 |
| S8 | Rate limiting login/reset (par IP + par email) | Phase 2 |
| S9 | MFA/2FA sur les comptes SUPER_ADMIN | Phase 2 |
| S10 | Upload logos validé (MIME réel, taille, renommage serveur, pas de CSS libre) | Phase 2 (Doc 13) |
| S11 | Expiration de session + rotation (Wasp sessions) | Phase 3 |
| S12 | Impossibilité de désactiver le dernier SUPER_ADMIN (garde en action) | Phase 1 |

## 10. Phasage recommandé

| Phase | Contenu | Livrable |
|---|---|---|
| **P1 — SaaS Core** | `platformRole` + statut entreprise + `Invitation` + `AuditLog` + action `creerEntreprise` + email d'activation + console Platform minimale (Entreprises + wizard + Détail) | Création d'une entreprise end-to-end |
| **P2 — Branding** | `BrandingConfig` + Branding Studio + QR Designer (Doc 13) + limites de plan appliquées | Personnalisation par entreprise |
| **P3 — Durcissement** | Rate limiting, 2FA super admin, gestion des sessions, exports audit | Sécurité niveau SaaS pro |

## 11. Ce qui NE change PAS (protéger l'existant)

- La page de collecte `/q/*` et sa performance (Doc 00 §4) : le branding client s'y injecte via `useBrand()` alimenté par entreprise, sans alourdir le chemin critique.
- La confidentialité chef d'agence / Direction (Doc 08) : le multi-tenant s'ajoute AU-DESSUS, sans la modifier.
- `rowLevelSecurity.ts` reste le module unique de permissions ; la platform layer s'ajoute dedans.
- Les jobs, alertes, IA, rapport mensuel : inchangés — ils sont déjà filtrés par agence/entreprise.
