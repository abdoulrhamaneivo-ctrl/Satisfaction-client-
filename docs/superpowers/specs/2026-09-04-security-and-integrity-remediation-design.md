# Security and Integrity Remediation Design

## Goal

Correct the confirmed authentication, privileged-access, tenant-isolation,
public-submission, QR routing, file ownership, and account-identity defects
without expanding the product scope. Yeba remains an invitation-only internal
tool; no commercial or public-registration capability is introduced.

## Constraints

- Keep the current Wasp email login and password-reset flows.
- Block direct public registration at the HTTP boundary even though the Wasp
  email provider generates a signup handler.
- Preserve existing generated Wasp code; changes belong in application source.
- Keep the existing database shape where practical. A migration is justified
  only when an invariant cannot be safely enforced in application code.
- A tenant-owned criterion may be associated with a shared service for
  tenant-specific configuration, but it must never be returned to another
  tenant or activated for another tenant's agency.
- All state-changing SUPER_ADMIN operations require an enrolled, valid TOTP
  code. TOTP enrolment and activation remain the only exceptions.

## Security Design

### Invitation-only accounts and activation links

`serveStaticClient` will install a pre-router security middleware regardless
of whether the SPA bundle is present. It will reject `POST /auth/email/signup`
with a generic 404 response. This preserves login and password reset while
closing the generated Wasp signup route. The same placement makes the existing
authentication rate limit effective for both Render's monolithic deployment
and the separate-client deployment.

Resending a platform invitation will revoke every unused invitation for the
same invited user before creating the new one. Activation will consume the
token through a conditional update inside the transaction so two concurrent
uses cannot both win. The password update remains performed through Wasp's
auth API, but only after the invitation is atomically claimed.

### SUPER_ADMIN TOTP

The TOTP guard will require both an active TOTP enrolment and a valid code for
every state-changing platform action. It will return a clear precondition
error when enrolment is missing. The Security page will expose the existing
setup/confirmation flow and accept a TOTP code when inviting an administrator.
Other platform write forms will send the required code with their existing
operation payloads. Read-only platform queries are not changed in this pass;
the stateless Wasp action model currently has no server-side per-session TOTP
proof, so claiming console-wide MFA would be misleading.

### Tenant boundaries

Tenant filtering will be centralized for service/criterion presentation:

- `getCriteresParOperation` returns a shared criterion or one belonging to
  the caller's entreprise, never another tenant's criterion.
- duplicating a criterion copies only agency links belonging to the caller's
  entreprise; it may only copy service links visible to that tenant.
- moving/removing a shared criterion is refused. A tenant must duplicate a
  shared criterion before changing its service assignment.
- creating or updating an objective verifies that its criterion is visible to
  the caller and active for the selected agency.

This preserves shared baseline services and criteria while preventing the
cross-tenant relationships found during the audit from becoming visible or
modifiable outside their owner tenant.

### Public submission and uploads

For a selected service, every submitted criterion must be attached to that
service. The idempotency marker becomes a separate submission marker with a
unique key (rather than attempting to make each answer row unique); answers
are inserted in the same transaction after the marker is claimed. This handles
both multiple answers per form and concurrent retries.

File metadata creation will require the S3 key to be under the authenticated
user's generated prefix. The file record will also enforce a unique key, so a
known object cannot be claimed by a second user.

### Account identity and QR routing

Staff e-mail updates will change the Wasp email identity and User record as a
single operation after validating the new address. Opaque QR pages will treat
a valid `code` route parameter as sufficient and will not require a numeric
`guichetId`.

## Data Model Changes

- Add a `Soumission` model with a UUID primary key, one row per public form
  submission, and a unique client idempotency key. `Reponse` gets a required
  relation to that submission. The existing `id_soumission` remains populated
  during migration/compatibility and will be removed only in a later cleanup.
- Add `@unique` to `File.s3Key` to align database ownership metadata with S3
  object identity.

The migration backfills one `Soumission` per distinct non-null legacy
`id_soumission` and one per legacy response without an id. It is deliberately
separate from source changes and must be reviewed against a production backup
before applying.

## Testing Strategy

Because the project has no application test command today, add Node's built-in
test runner with focused pure helpers and integration-style tests around
transactional guards. Each fix follows red-green-refactor:

1. registration guard and rate-limit middleware ordering;
2. invitation revocation and single-use claim;
3. TOTP enrolment/validation guard;
4. tenant criterion filtering and clone scoping;
5. service/criterion submission validation and idempotent marker;
6. S3 owner-prefix validation, identity update preparation, and QR parameter
   resolution.

The final verification runs the project tests, TypeScript checks for both
`src` and Wasp declarations, Prisma validation/migration checks, and the Wasp
build where the local environment permits it.

## Non-goals

- No public signup or onboarding flow.
- No new billing, plans, marketing pages, or multi-tenant product expansion.
- No claim that platform read-only pages have a session-bound second factor;
  that requires a separate session design.
