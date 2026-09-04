# Security and Integrity Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the verified authentication, authorization, tenant-isolation, submission-integrity, and object-ownership defects without reintroducing public signup or multi-tenant product features.

**Architecture:** Keep enforcement on the server. Small, pure policy helpers give the important routing, object-ownership, criterion-scope, and MFA-enrollment rules direct regression coverage; Wasp actions remain responsible for database reads and atomic writes. The public submission idempotency key becomes a parent `Soumission` record, which makes duplicate handling database-atomic while preserving grouped `Reponse` analytics.

**Tech Stack:** Wasp, React, TypeScript, Prisma/PostgreSQL, Express, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-04-security-and-integrity-remediation-design.md`

## Global Constraints

- This is a mono-agence internal tool: do not add public signup, billing, marketing, or multi-tenant configuration UI.
- Edit source files, not generated Wasp output; run `wasp build` after schema or Wasp declaration changes.
- Use the already-installed Vitest dependency; add the missing `npm test` script but no new test package.
- Every state-changing `SUPER_ADMIN` operation must require an enrolled, valid TOTP code. Enrollment/confirmation remain the bootstrap exception.
- A private criterion is visible and mutable only in its owning agency; global criteria remain read-only in per-agency assignment flows.
- A submitted response must use a criterion explicitly linked to the chosen service.
- The migration must be non-destructive: stop with a clear error if existing duplicate `File.s3Key` values would make the new unique index unsafe.
- Public endpoints fail closed: reject malformed QR identifiers and public `/auth/email/signup` requests.

---

## File and responsibility map

| File | Responsibility |
| --- | --- |
| `package.json` | Expose the existing Vitest runner as `npm test`. |
| `src/server/security/policies.ts` | Pure policies for public-signup blocking and user-owned S3 keys. |
| `src/client/collecte/routeParams.ts` | Parse one opaque-or-numeric public collection identifier safely. |
| `src/server/staticServing.ts` | Insert security middleware before the Wasp router on all deployment layouts. |
| `src/server/actionsPlatform.ts` / `queriesPlatform.ts` | Enforce platform MFA, invalidate prior invitations, and expose MFA state. |
| `src/client/platform/pages/*` | Let a SuperAdmin enroll in TOTP and supply a code with all platform writes. |
| `src/server/tenant/criteriaScope.ts` | Pure ownership and association rules used by criterion actions and queries. |
| `src/server/actions.ts` / `queries.ts` | Enforce tenant/service boundaries and atomically persist submissions. |
| `schema.prisma` / `migrations/*` | Add `Soumission`, the response foreign key, and unique S3 key constraint. |
| `src/file-upload/operations.ts` / `src/server/actions.ts` | Enforce S3 ownership and synchronize email authentication identities. |
| `main.wasp.ts` / `src/client/collecte/CollectePage.tsx` | Use a single public route and submit the guichet resolved server-side. |

### Task 1: Add the test entry point and pure security boundary policies

**Files:**
- Modify: `package.json`
- Create: `src/server/security/policies.ts`
- Create: `src/server/security/policies.test.ts`
- Create: `src/client/collecte/routeParams.ts`
- Create: `src/client/collecte/routeParams.test.ts`

**Interfaces:**
- Produces `isPublicSignupRequest(method: string, path: string): boolean`.
- Produces `isS3KeyOwnedByUser(userId: string, s3Key: string): boolean`.
- Produces `parseCollecteIdentifier(identifiant: string): { kind: 'guichetId'; guichetId: number } | { kind: 'publicCode'; code: string } | null`.

- [ ] **Step 1: Write failing policy tests**

```ts
import { expect, test } from 'vitest';
import { isPublicSignupRequest, isS3KeyOwnedByUser } from './policies';

test('only blocks the public email signup POST', () => {
  expect(isPublicSignupRequest('POST', '/auth/email/signup')).toBe(true);
  expect(isPublicSignupRequest('GET', '/auth/email/signup')).toBe(false);
  expect(isPublicSignupRequest('POST', '/auth/email/login')).toBe(false);
});

test('requires the user id plus a path separator for an S3 key', () => {
  expect(isS3KeyOwnedByUser('12', '12/uuid.png')).toBe(true);
  expect(isS3KeyOwnedByUser('12', '123/uuid.png')).toBe(false);
  expect(isS3KeyOwnedByUser('12', '12')).toBe(false);
});
```

```ts
import { expect, test } from 'vitest';
import { parseCollecteIdentifier } from './routeParams';

test('accepts a safe numeric guichet id and preserves opaque public codes', () => {
  expect(parseCollecteIdentifier('42')).toEqual({ kind: 'guichetId', guichetId: 42 });
  expect(parseCollecteIdentifier('QRCODE-abc_9')).toEqual({ kind: 'publicCode', code: 'QRCODE-abc_9' });
});

test('rejects empty, unsafe, and malformed numeric identifiers', () => {
  expect(parseCollecteIdentifier('')).toBeNull();
  expect(parseCollecteIdentifier('9007199254740992')).toBeNull();
  expect(parseCollecteIdentifier('4.2')).toBeNull();
});
```

- [ ] **Step 2: Confirm the tests fail and add the runner script**

Run: `npm test -- src/server/security/policies.test.ts src/client/collecte/routeParams.test.ts`

Expected: failure because the two source modules do not exist. Add `"test": "vitest run"` to `package.json` and no dependency change.

- [ ] **Step 3: Implement the minimal pure policies**

```ts
export function isPublicSignupRequest(method: string, path: string): boolean {
  return method.toUpperCase() === 'POST' && path === '/auth/email/signup';
}

export function isS3KeyOwnedByUser(userId: string, s3Key: string): boolean {
  const prefix = `${userId}/`;
  return s3Key.startsWith(prefix) && s3Key.length > prefix.length;
}
```

`parseCollecteIdentifier` must accept only positive safe integers as numeric IDs. A non-empty identifier that is not all decimal digits is an opaque code; a decimal integer outside `Number.isSafeInteger` is invalid, not an opaque code.

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- src/server/security/policies.test.ts src/client/collecte/routeParams.test.ts`

Expected: all four tests pass.

- [ ] **Step 5: Commit the test foundation**

```bash
git add package.json src/server/security src/client/collecte/routeParams.ts src/client/collecte/routeParams.test.ts
git commit -m "test: add security policy coverage"
```

### Task 2: Fail closed for public signup, platform invitations, and SuperAdmin writes

**Files:**
- Modify: `src/server/staticServing.ts`
- Modify: `src/server/actionsPlatform.ts`
- Modify: `src/server/queriesPlatform.ts`
- Create: `src/server/security/platformMfa.ts`
- Create: `src/server/security/platformMfa.test.ts`
- Create: `src/server/staticServing.test.ts`
- Modify: `src/client/platform/pages/SecurityPage.tsx`
- Modify: `src/client/platform/pages/CreateCompanyPage.tsx`
- Modify: `src/client/platform/pages/CompanyDetailsPage.tsx`

**Interfaces:**
- Consumes Task 1 `isPublicSignupRequest`.
- Produces `hasEnrolledTotp({ totp_actif, totp_secret }): boolean` and uses it before verifying a platform TOTP token.
- `getPlatformMe` returns `totp_actif: boolean` for the current SuperAdmin.

- [ ] **Step 1: Write the failing MFA enrollment tests**

```ts
import { expect, test } from 'vitest';
import { hasEnrolledTotp } from './platformMfa';

test('requires both the active flag and encrypted secret', () => {
  expect(hasEnrolledTotp({ totp_actif: true, totp_secret: 'ciphertext' })).toBe(true);
  expect(hasEnrolledTotp({ totp_actif: false, totp_secret: 'ciphertext' })).toBe(false);
  expect(hasEnrolledTotp({ totp_actif: true, totp_secret: null })).toBe(false);
});
```

```ts
import express from 'express';
import { expect, test } from 'vitest';
import { serveStaticClient } from './staticServing';

test('denies public signup before an already mounted Wasp router', async () => {
  const app = express();
  const waspRouter = express.Router();
  waspRouter.post('/auth/email/signup', (_req, res) => res.status(201).end());
  app.use(waspRouter);
  const server = app.listen(0);
  await serveStaticClient({ app, server });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${(address as any).port}/auth/email/signup`, { method: 'POST' });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  expect(response.status).toBe(404);
});
```

- [ ] **Step 2: Implement server-side enforcement**

Add `hasEnrolledTotp` and make the existing TOTP guard throw `HttpError(428, ...)` if the authenticated SuperAdmin has not completed enrollment. Keep `activer2fa` as the only confirmation bootstrap path.

Call that guard in `creerEntreprise`, `renvoyerInvitation`, and `inviterSuperAdmin` as well as the existing platform mutation actions. Every call must receive `args.totpCode`; do not accept an omitted code once enrollment is complete.

In `renvoyerInvitation`, update every unused invitation for the same `email` and `id_entreprise` with `used_at: new Date()` before storing a freshly generated token. The activation action must reject any token with `used_at` set.

In `staticServing.ts`, install a middleware which returns `404` for `isPublicSignupRequest(req.method, req.path)` and moves that layer before the first Wasp router even if the SPA build directory is absent. Move static and SPA fallback layers before the same router as well, preserving current request logging and rate limiting.

- [ ] **Step 3: Expose usable TOTP controls in the platform UI**

In `SecurityPage`, call the existing setup action if `me.totp_actif` is false, render the returned secret for manual authenticator entry, and submit the six-digit code to the activation action. Do not label TOTP as optional.

Add a required `totpCode` input to the company-creation form and pass it to `creerEntreprise`. In the company details page, show one required six-digit confirmation field before invite, resend, suspend, reactivate, limit, or platform-role requests, and include it in each action payload. Keep account activation separate: it is a recipient flow, not a SuperAdmin operation.

- [ ] **Step 4: Run focused tests and type/build validation**

Run: `npm test -- src/server/security/platformMfa.test.ts src/server/security/policies.test.ts`

Run: `wasp build`

Expected: focused tests pass and Wasp compiles both platform action argument changes and UI callers.

- [ ] **Step 5: Commit platform access protections**

```bash
git add src/server/staticServing.ts src/server/staticServing.test.ts src/server/actionsPlatform.ts src/server/queriesPlatform.ts src/server/security/platformMfa.ts src/server/security/platformMfa.test.ts src/client/platform/pages
git commit -m "fix: enforce platform MFA and invitation revocation"
```

### Task 3: Enforce tenant-safe criterion and service associations

**Files:**
- Create: `src/server/tenant/criteriaScope.ts`
- Create: `src/server/tenant/criteriaScope.test.ts`
- Modify: `src/server/actions.ts`
- Modify: `src/server/queries.ts`

**Interfaces:**
- Produces `isCriterionVisibleToAgency(idAgenceCriterion: number | null, agencyId: number): boolean`.
- Produces `isPrivateCriterionOwnedByAgency(idAgenceCriterion: number | null, agencyId: number): boolean`.
- Produces `criterionIdsOutsideService(selectedIds: number[], serviceCriterionIds: number[]): number[]`.

- [ ] **Step 1: Write the failing scope tests**

```ts
import { expect, test } from 'vitest';
import {
  criterionIdsOutsideService,
  isCriterionVisibleToAgency,
  isPrivateCriterionOwnedByAgency,
} from './criteriaScope';

test('global criteria are visible but cannot be mutated as a private criterion', () => {
  expect(isCriterionVisibleToAgency(null, 8)).toBe(true);
  expect(isPrivateCriterionOwnedByAgency(null, 8)).toBe(false);
  expect(isPrivateCriterionOwnedByAgency(8, 8)).toBe(true);
  expect(isPrivateCriterionOwnedByAgency(9, 8)).toBe(false);
});

test('reports every selected criterion missing from the service', () => {
  expect(criterionIdsOutsideService([2, 3, 5], [2, 5])).toEqual([3]);
});
```

- [ ] **Step 2: Implement the pure scope helpers and run their tests**

Run: `npm test -- src/server/tenant/criteriaScope.test.ts`

Expected before implementation: module-not-found failure. Implement the three helpers without Prisma imports, then rerun with all tests passing.

- [ ] **Step 3: Apply the scope rules to reads and mutations**

In `getCriteresParOperation`, filter nested criterion links to criteria whose `id_agence` is `null` or equals the requesting agency. Ensure `assignedIds` is calculated from that same scoped set.

In `duplicateCritere`, copy only `AgenceCritere` and `CritereService` associations for the source criterion's owner agency. Never copy another agency's private associations.

In `upsertObjectif`, verify each `id_critere` is visible to the acting agency and is active for it before creating/updating an objective. Reject a cross-agency or inactive criterion with `HttpError(403, ...)`.

In `moveCritereToService` and removal/assignment flows, reject global criteria for mutation and reject private criteria whose `id_agence` differs from the acting agency. Preserve global criteria as platform-managed templates rather than silently moving shared links.

- [ ] **Step 4: Run regressions and build**

Run: `npm test -- src/server/tenant/criteriaScope.test.ts`

Run: `wasp build`

Expected: helpers pass; TypeScript confirms the narrowed query data and action changes.

- [ ] **Step 5: Commit tenant boundary protections**

```bash
git add src/server/tenant src/server/actions.ts src/server/queries.ts
git commit -m "fix: scope criteria and service relations by agency"
```

### Task 4: Make public response submission service-bound and idempotent in the database

**Files:**
- Modify: `schema.prisma`
- Create: `migrations/20260905090000_submission_integrity/migration.sql`
- Create: `src/server/publicSubmission.ts`
- Create: `src/server/publicSubmission.test.ts`
- Modify: `src/server/actions.ts`
- Modify: `main.wasp.ts`

**Interfaces:**
- Produces `criterionIdsOutsideService` consumer behavior from Task 3 for `soumettreAvis`.
- Adds Prisma model `Soumission { id, created_at, reponses }` and relation `Reponse.soumission` through existing `id_soumission`.
- `soumettreAvis` returns `{ success: true }` for a completed idempotent retry and never returns an earlier response record.

- [ ] **Step 1: Write the failing service-membership test**

```ts
import { expect, test } from 'vitest';
import { assertCriteriaLinkedToService } from './publicSubmission';

test('rejects a public answer criterion not configured for the selected service', () => {
  expect(() => assertCriteriaLinkedToService([11, 12], [11])).toThrow('12');
  expect(() => assertCriteriaLinkedToService([11], [11, 13])).not.toThrow();
});
```

- [ ] **Step 2: Implement the service assertion and use it before persistence**

`assertCriteriaLinkedToService(answerCriterionIds, serviceCriterionIds)` must derive missing IDs with Task 3's helper and throw an error naming those IDs. In `soumettreAvis`, after validating the guichet/service relationship, query the selected service's linked active criteria and reject every submitted criterion that is absent. Preserve the existing agency-active criterion check.

- [ ] **Step 3: Add the non-destructive schema migration**

Add this Prisma shape:

```prisma
model Soumission {
  id         String     @id
  created_at DateTime   @default(now())
  reponses   Reponse[]
}

model Reponse {
  // existing fields
  id_soumission String?
  soumission    Soumission? @relation(fields: [id_soumission], references: [id], onDelete: SetNull)
  @@index([id_soumission])
}

model File {
  // existing fields
  s3Key String @unique
}
```

The SQL migration must create `Soumission`, backfill one row per non-null legacy `Reponse.id_soumission` with `MIN(date_reponse)`, add the foreign key with `ON DELETE SET NULL`, and add the unique `File.s3Key` index. Before the unique index, use a PostgreSQL `DO $$ ... RAISE EXCEPTION ... $$;` check for duplicate non-null keys. Do not delete or merge live data in a migration.

- [ ] **Step 4: Replace check-then-insert idempotency with an atomic parent creation**

Include `Soumission` in the Wasp action entity declaration. For a supplied idempotency ID, first check `Soumission.findUnique({ where: { id } })` and return `{ success: true }` if it exists; do not read or return a `Reponse` row.

For a new request, put `tx.soumission.create({ data: { id: submissionId } })` and `tx.reponse.createMany({ data: lignes })` in one `prisma.$transaction`. Catch only Prisma `P2002` on the parent ID for a concurrent retry and return `{ success: true }`; rethrow every other failure. Retain the existing Canal retry behavior inside the transaction boundary so a failed response insert rolls back the parent marker.

- [ ] **Step 5: Run tests, validate the schema, and build generated output**

Run: `npm test -- src/server/publicSubmission.test.ts src/server/tenant/criteriaScope.test.ts`

Run: `npx prisma validate --schema schema.prisma`

Run: `wasp build`

Expected: tests pass, Prisma accepts the relation and unique index, and generated deployment migrations are refreshed by the build.

- [ ] **Step 6: Commit submission integrity work**

```bash
git add schema.prisma migrations src/server/publicSubmission.ts src/server/publicSubmission.test.ts src/server/actions.ts main.wasp.ts .wasp/out
git commit -m "fix: make public submissions service-bound and idempotent"
```

### Task 5: Prevent cross-user S3 claims and synchronize staff email login identities

**Files:**
- Modify: `src/file-upload/operations.ts`
- Modify: `src/server/actions.ts`
- Modify: `src/server/security/policies.test.ts`

**Interfaces:**
- Consumes Task 1 `isS3KeyOwnedByUser`.
- The `updateAgent` email path updates `User.email` and its `AuthIdentity.providerUserId` in one Prisma transaction when an email identity exists.

- [ ] **Step 1: Extend the existing S3 policy test with an adversarial key**

```ts
test('does not accept another user key with a guessed UUID', () => {
  expect(isS3KeyOwnedByUser('user-a', 'user-b/known-object.png')).toBe(false);
  expect(isS3KeyOwnedByUser('user-a', 'user-a/known-object.png')).toBe(true);
});
```

- [ ] **Step 2: Enforce object ownership before metadata persistence**

In `addFileToDb`, after confirming an authenticated user and before `checkFileExistsInS3`, reject a key that fails `isS3KeyOwnedByUser(context.user.id, args.s3Key)` with `HttpError(403, ...)`. Keep the existence check: an own-prefix key that was never uploaded must still fail.

- [ ] **Step 3: Make email changes atomic and non-orphaning**

Normalize a supplied agent email by trimming and lowercasing it. Reject an invalid non-empty email and reject removal of an email when the existing user has an email authentication identity. Check that the normalized address is not already assigned to another user.

When the prior email has an `AuthIdentity` for provider `email`, update `User.email` and `AuthIdentity.providerUserId` inside the same `prisma.$transaction`, using the same compound identity key pattern already used by `src/user/accountsActions.ts`. If no authentication identity exists, update the profile email only; do not create a surprise login account.

- [ ] **Step 4: Run policy tests and build**

Run: `npm test -- src/server/security/policies.test.ts`

Run: `wasp build`

Expected: S3 tests pass and the server compiles the Prisma transaction and imports.

- [ ] **Step 5: Commit ownership and identity fixes**

```bash
git add src/file-upload/operations.ts src/server/actions.ts src/server/security/policies.test.ts
git commit -m "fix: protect file ownership and agent email identity"
```

### Task 6: Repair opaque QR public routing and use the server-resolved guichet

**Files:**
- Modify: `main.wasp.ts`
- Modify: `src/server/queries.ts`
- Modify: `src/client/collecte/CollectePage.tsx`
- Modify: `src/client/collecte/routeParams.test.ts`

**Interfaces:**
- Consumes Task 1 `parseCollecteIdentifier`.
- `getFormDefinitionForGuichet` returns `guichetId: number` in addition to its existing presentation data.
- One route is `/q/:identifiant`; numeric values resolve by guichet id and opaque values by public code.

- [ ] **Step 1: Add a regression for a numeric-looking invalid public identifier**

```ts
test('does not reinterpret an unsafe decimal code as an opaque code', () => {
  expect(parseCollecteIdentifier('999999999999999999999')).toBeNull();
});
```

- [ ] **Step 2: Collapse the ambiguous public routes**

Replace the two same-shape routes (`/q/:guichetId` and `/q/:code`) with exactly one `/q/:identifiant` route. In `CollectePage`, parse `params.identifiant` once, pass either `{ id_guichet }` or `{ code_public }` to the form query, and show the existing unavailable state for `null`.

- [ ] **Step 3: Submit only the guichet resolved by the trusted form definition**

Add `guichetId: guichet.id` to the successful public form query response. Remove the client-side `Number(params...)` submission source; `soumettreAvis` receives `guichetId: formDef.guichetId`. Preserve the existing code display and response fields.

- [ ] **Step 4: Run route tests and build**

Run: `npm test -- src/client/collecte/routeParams.test.ts`

Run: `wasp build`

Expected: route tests pass and the public page/action query types compile.

- [ ] **Step 5: Commit QR routing repair**

```bash
git add main.wasp.ts src/server/queries.ts src/client/collecte/CollectePage.tsx src/client/collecte/routeParams.test.ts
git commit -m "fix: support opaque QR collection routes"
```

## Final verification

- [ ] Run `npm test` and record the full result.
- [ ] Run `npx prisma validate --schema schema.prisma`.
- [ ] Run `wasp build` from the isolated worktree.
- [ ] Inspect `git diff a192088..HEAD --check` for whitespace errors and review the changed migration SQL before any deployment.
- [ ] Verify `git status --short` is clean apart from generated files intentionally produced and committed by `wasp build`.

## Plan self-review

| Spec requirement | Task coverage |
| --- | --- |
| Invite replay and mandatory SuperAdmin 2FA | Task 2 |
| Public signup denial and middleware ordering | Task 2 |
| Criterion tenant/service isolation | Task 3 and Task 4 |
| Atomic idempotency and data migration | Task 4 |
| S3 ownership and unique metadata key | Task 1 and Task 5; schema index in Task 4 |
| Agent email/AuthIdentity synchronization | Task 5 |
| Opaque QR route and trusted guichet ID | Task 1 and Task 6 |

The plan uses the same helper signatures in every consuming task, contains no package addition beyond the existing Vitest runner script, and leaves production migration application outside this worktree.
