# S1-03 · Local Keycloak identity stack

**Status:** Ready · **Slice:** Session 1 · Walking skeleton · **Priority:** P1
**Depends on:** None. [ADR-0010](../adr/0010-identity-provider-keycloak.md) (Accepted) decides the provider. [ADR-0005](../adr/0005-local-cloud-emulation.md) and [ADR-0006](../adr/0006-development-feedback-loops-ports-and-fakes.md) (Accepted) set the local-stand-in rules.
**Related:** [requirements](../requirements.md) (Session 1 walking skeleton row; F1.1 age gate at sign-up; F6.1 delete all data), [ADR-0010](../adr/0010-identity-provider-keycloak.md) (follow-up "Local service"), [security guide](../security.md) (sections 2, 3, 5, 9, 13), [local development guide](../local-development.md), [compose.yaml](../../compose.yaml), [S1-01](S1-01-anonymous-wardrobe-upload.md) (spec format reference)

## Problem

ADR-0010 chose self-hosted Keycloak as the identity provider and left a local service as follow-up work. Without it, Session 1 sign-up and sign-in cannot run offline against the same issuer, JWKS and token flow that production uses, so developers would test against a fake or not at all.

Requirement served: the Session 1 walking skeleton row in [requirements](../requirements.md) ("A persona can sign up and land on an empty wardrobe"), with F1.1 (18+ gate at sign-up) and F6.1 (delete all data) as the account rules the later sign-up and deletion tickets must meet. This spec supplies the local identity provider only. It does not build sign-up, the 18+ gate, consent screens or any user-scoped endpoint.

Label note: CLAUDE.md, the security guide and ADR-0010 call the identity provider decision "F02". `requirements.md` numbers the account items F1.1 and F6.1, and this spec uses that numbering.

## Goals

- One command starts Keycloak next to PostgreSQL and the S3 stand-in, with the `slay-drip` realm imported from `infra/dev/`.
- The app reads the same config keys locally and in production (`OIDC_ISSUER_URL`, `OIDC_JWKS_URL`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE`, `KEYCLOAK_*`). Each key has a local value and a Scaleway value in the config contract.
- A smoke script proves the discovery document, the public PWA client with PKCE S256, a synthetic PKCE sign-in, and the admin client's delete and session-revoke rights.

## Non-goals

- Sign-up, the 18+ gate, consent screens, account deletion in the app, and any app code. These belong to later Session 1 and F6 tickets.
- Scaleway deployment, the two-instance serverless spike in ADR-0010, and the production database for Keycloak. The local run does not prove them.
- ADR-0010 open items: passkeys or magic links for the MVP, the Scaleway region, the backup erasure window, and who runs the service. These are **not needed for local work and are not decided here**. The local realm uses password credentials for synthetic users only, to exercise the token flow. That is not the MVP login method.
- AWS resources, SDKs or CLIs. Any other identity vendor.

## Scope

- `compose.yaml`: a `keycloak` service, pinned by exact image tag, bound to `127.0.0.1` on one free host port, dev mode with realm import, healthcheck, no named volume.
- `infra/dev/keycloak/`: the realm import file (clients, audience mapper, service-account role, synthetic users) and the local admin config for the Keycloak console.
- `scripts/dev/keycloak_smoke.py`: the smoke check, in the style of `scripts/dev/s3_smoke.py`.
- `docs/local-development.md`: Keycloak section, config contract rows, troubleshooting, commands, feature checklist.
- `frontend/tests/`: the acceptance and hard-rule tests for this spec (see Acceptance criteria and Quality and compliance). This is the only test location the acceptance-author role owns.

## Design

**Service.** The image is the upstream Keycloak release, pinned by an exact tag that the executor verifies on the registry (see ticket S1-03.01). Dev mode (`start-dev --import-realm`) with the built-in dev file store. The container listens on 8080 and is published as `127.0.0.1:8180`. The management port is not published. `KC_HOSTNAME` fixes the issuer to `http://127.0.0.1:8180/realms/slay-drip`, so the `iss` claim matches `OIDC_ISSUER_URL`.

**Data lifetime.** No named volume. A recreated container re-imports the realm from `infra/dev/`. Changing the realm file needs `docker compose down` and `up` (the import skips a realm that already exists). Wiping all local data is `docker compose down`, as for the other stand-ins.

**Realm `slay-drip`.**

- Client `slay-drip-pwa`: public. Authorization code flow with PKCE, method `S256` required. Direct grants and implicit flow off. Redirect URI and web origin for the local frontend only (`http://localhost:5173`, the Vite default). The callback path `/auth/callback` is proposed here and confirmed by the frontend ticket that adds sign-in. An audience mapper adds `slay-drip-api` to access tokens.
- Client `slay-drip-backend-admin`: confidential, client credentials through a service account. The service account holds the realm-management role `manage-users` and no other role. Deleting a user and revoking its sessions both need only that role. If a later ticket needs more, it records why.
- Self-service registration on in the local realm only (`registrationAllowed: true`), amended 2026-10-28 at the user's request. The Keycloak form is the sign-up entry point, so the server-side 18+ gate (F1.1, BE-49) is still needed before any real sign-up. It is not built yet.
- Access token lifespan 300 seconds (security guide, section 5).
- Three synthetic users: emails on `example.test`, invented names, no age, date of birth, postal address, body or special-category attributes. Keycloak stores only the account identifier, email and credentials (ADR-0010).

**Admin console.** Bootstrap admin credentials for the local console live in `infra/dev/keycloak/local-admin.conf`, which compose reads with `env_file`. The file is not named `.env`.

**Healthcheck.** A probe that the pinned image already ships. No packages are installed at container start.

**Secrets.** Local passwords and the admin client secret are throwaway values in committed `infra/dev/` files, the same pattern as `infra/dev/s3.json`. They are valid only for this stack. Production values come from the container environment and never appear in the repo (security guide, section 9).

**Smoke.** Uses `curl` and `openssl` (both ship with Git Bash) and no `jq`, so it adds no dependency. It drives the PWA's own flow: authorization request with an S256 challenge, login form, redirect with a code, token request with the verifier.

## Acceptance criteria

Each scenario below is copied verbatim into an acceptance-author ticket (S1-03.06 to S1-03.08). Those tickets run first and fail until their build ticket lands. The feature files are `frontend/tests/features/local-keycloak-stack.feature`, `local-keycloak-sign-in.feature` and `local-keycloak-docs.feature`, each tagged `@S1-03`. The build ticket that turns each scenario green is named in its Tickets row.

The hard rules (EU region only, no AWS reference, synthetic personas only, no user-scoped endpoint) are not feature scenarios. They are held in their own hard-rule tickets (S1-03.09 to S1-03.12) and cited under Quality and compliance.

Stack and discovery (S1-03.06, built by S1-03.01):

```gherkin
Scenario: The local identity provider starts beside PostgreSQL and the S3 stand-in
  Given the local stack is stopped
  When I run "docker compose up -d" from the repo root
  Then the keycloak service is running and reports healthy
  And keycloak listens on 127.0.0.1 only
  And the database and object-storage services are still running
  And keycloak has no named volume

Scenario: The local identity provider publishes its discovery document and keys
  Given the keycloak service is healthy
  When I request the discovery document and the JWKS URL from the config contract
  Then both respond with HTTP 200
  And the discovery issuer equals the value of OIDC_ISSUER_URL
  And the discovery document gives the JWKS URL equal to OIDC_JWKS_URL
  And the discovery document lists S256 as a supported code challenge method

Scenario: The PWA client refuses sign-in without a PKCE S256 challenge
  Given the slay-drip realm is imported
  When an authorization request for client slay-drip-pwa arrives without a code challenge
  Then the request is refused and no login form is shown
  And the redirect URIs of slay-drip-pwa list only paths on http://localhost:5173
```

Sign-in and admin client (S1-03.07, built by S1-03.02):

```gherkin
Scenario: A synthetic persona signs in with authorization code and PKCE S256
  Given the slay-drip realm is imported with the synthetic persona smoke.user@example.test
  When the smoke script runs the authorization code flow with PKCE S256 for client slay-drip-pwa
  Then the token endpoint returns an access token and an ID token
  And the access token audience includes slay-drip-api
  And the script ends with "OK: Keycloak smoke passed"

Scenario: The backend admin client can create, log out and delete a throwaway user
  Given client slay-drip-backend-admin is configured for client credentials
  When the smoke script gets a token, creates a throwaway synthetic user, revokes its sessions and deletes it
  Then the create, logout and delete calls return HTTP 201, 204 and 204
  And the throwaway user is no longer found afterwards

Scenario: Self-service registration is on in the local realm
  Given the committed realm file is infra/dev/keycloak/realm/slay-drip-realm.json
  When the smoke script reads that file
  Then registrationAllowed is true
  And the script reports this as a static check of the committed file
```

Docs (S1-03.08, built by S1-03.03):

```gherkin
Scenario: The local development guide documents the Keycloak config contract
  Given the Keycloak service and the smoke script are merged
  When I read docs/local-development.md
  Then it has a Keycloak section with the start and smoke commands
  And the config contract lists each OIDC and KEYCLOAK key with a local value and a Scaleway value
  And the troubleshooting section covers the port, the realm not re-importing, and the image tag check
```

## Quality and compliance

- AI quality bar: N/A.
- Hard constraints that must hold 100% of the time: N/A.
- Hard rules, each held by a hard-rule ticket that runs in wave 1 (see Tickets):
  - EU-only regions (`fr-par`, `nl-ams`, `pl-waw`) in the stack config: S1-03.09.
  - No AWS resource, SDK or CLI reference in the Keycloak files and the local guide: S1-03.10.
  - Synthetic personas only in the realm and smoke fixtures: S1-03.11.
  - No user-scoped API endpoint added by this spec: S1-03.12.
- Consent, retention and EU-only impact: no personal data, only synthetic personas. Keycloak holds the account identifier, email and credentials, so the production version falls under the Scaleway EU-region rules in ADR-0010. Local data is wiped with `docker compose down`. The only external traffic is the image pull, which carries no personal data. No consent record lives in Keycloak; consent stays in the app's database.
- Age gate: F1.1 is enforced by the app at sign-up on the server. This spec adds no age data to Keycloak and turns self-registration on for local development only. Sign-up can therefore skip the app's 18+ gate until the server-side gate is built (open item).
- Accessibility (WCAG 2.1 AA) impact: none in this slice. The login page is Keycloak's own page. Its accessibility is checked when the sign-in screen is built.

## Test plan

- Unit / integration: none in the app. Acceptance scenarios run as Playwright API tests under `frontend/` (`npm run test:acceptance`), without a browser flow: S1-03.06 to S1-03.08. Hard-rule guards: S1-03.09 to S1-03.11 (Playwright, file checks) and S1-03.12 (Go, `backend/internal/server`). The compose service is also checked by `docker compose config --quiet`.
- Evals or golden-set checks: N/A.
- Manual or device checks: `docker compose up -d`, then `python scripts/dev/keycloak_smoke.py`, recorded in each PR (local-development feature checklist).

## Risks and open questions

| Risk or question | Impact | Owner | Mitigation |
| --- | --- | --- | --- |
| The Keycloak tag is not verified yet. The 26.8.x suggestion is unverified. | Compose may pin a tag that does not exist. | infra-engineer (S1-03.01) | Verify the tag on the registry in the PR and record how. Use the upstream registry if Docker Hub lacks it. |
| Env var names and the healthcheck probe differ between Keycloak releases (for example `KEYCLOAK_ADMIN` or `KC_BOOTSTRAP_ADMIN_*`). | Startup or health fails. | infra-engineer (S1-03.01) | Check the names and probe against the pinned tag. Do not add a new image. |
| Local store is the dev file store, not PostgreSQL. | Local runs do not prove the production database or the two-instance behaviour in ADR-0010. | Owner of the ADR-0010 spike (not assigned) | State the gap in local-development.md. The spike stays the gate before the first user endpoint. |
| The smoke parses the login form HTML. | A different Keycloak release could change the markup and break the check. | infra-engineer (S1-03.02) | The image is pinned. Note the markup dependency in the script. |
| Local realm uses password credentials. | Could be read as a decision on the MVP login method. | Product owner | Not a decision. The realm is for synthetic users only. Passkeys or magic links stay open in ADR-0010. |
| Throwaway secrets sit in committed files. | Someone may reuse them outside local dev. | privacy-reviewer (S1-03.04) | Same rule as `s3.json` (ADR-0005). Reviewed in S1-03.04. |
| Self-registration on (local realm) lets sign-up skip the app. | The 18+ gate must be enforced on the server before any real sign-up, and the local realm must hold synthetic users only. | Owner of the Session 1 sign-up spec (not written yet) | The sign-up ticket owns the gate test. This spec does not decide the sign-up design. |
| The admin client cannot read the realm (no `view-realm`), so `registrationAllowed` is checked in the committed file only. | The live state is not proven. | infra-engineer (S1-03.02) | Say "static check" in the script output. Grant no extra role without a recorded reason. |
| Acceptance-author owned paths (`frontend/tests/`) fit an infra-only spec only in part. Scenarios A to E call HTTP endpoints and `docker compose` from a Playwright run. The Playwright config also starts Vite and a browser project for every run. | The scenarios need Docker and the stack, and they start the frontend dev server they do not use. | User (approve, or name another owner) | Least-bad option, proposed: keep acceptance-author, use the Playwright request API for HTTP and a child-process call for `docker compose`, and run through `npm run test:acceptance` with no browser steps. The alternative is a test path owned by infra-engineer, which needs a `roles.md` change. Not decided here. |
| The breakdown rules allow 1 to 3 scenarios per ticket, so the single acceptance-author ticket the spec asked for becomes three (S1-03.06 to S1-03.08). | Dispatch has three red tickets, not one. | User (confirm) | The cap is a hard limit in `breakdown-rules.md`. Each ticket groups its scenarios by stack, sign-in and docs. |
| Ticket keys S1-03.06 to S1-03.12 are appended after S1-03.05, so the numbering does not follow dispatch order. | Readers may assume S1-03.05 runs first. | User (confirm) | Kept, as decided: no renumbering. The Tickets table waves give the order. Every new ticket name starts with its test type (red acceptance or hard-rule). |
| Hard-rule scenarios are not in the spec's Acceptance criteria. | The checker does not trace them to a build ticket, because a build ticket holds at most three scenarios. | User (confirm) | Each sits in its hard-rule ticket and is cited under Quality and compliance. S1-03.01 to S1-03.03 list the hard-rule tickets they must pass in their Notes. |
| The user-scoped endpoint guard probes a fixed list of paths. The router has only `GET /healthz` today. | A user-scoped route at a path not on the list would pass the guard. | backend-engineer (S1-03.12) | The list covers the paths this stack would use. Extend it in the same PR as any new route. |
| `scripts/dev/s3_smoke.py` uses curl's `--aws-sigv4` option and the `aws:amz` signing name for the S3 API. | The text matches an "AWS" search. It is not an AWS resource, SDK or CLI. | privacy-reviewer (S1-03.04) | Outside the S1-03.10 guard, which scans only the Keycloak files and the local guide. The review confirms it is protocol naming. |
| `roles.md` does not list `docs/local-development.md` for docs-steward (the user reassigned S1-03.03 to docs-steward). | The checker reports one ownership error on S1-03.03 until `roles.md` changes. | User (approve a `roles.md` change) | Add `docs/local-development.md` to the docs-steward owned paths. The planner cannot edit `.claude/`. S1-03.03 is not worked around. |

## Tickets

Waves: a ticket is in wave N+1 only when every blocker is in wave N or earlier. Wave 1 is the red acceptance and hard-rule tickets, then the build order S1-03.01 to S1-03.05.

| Key | Ticket | Role | Wave | Status | Blocked by |
| --- | --- | --- | --- | --- | --- |
| S1-03.01 | [Local Keycloak service and realm import](S1-03.01-local-keycloak-service-and-realm.md) | infra-engineer | 2 | To Do | S1-03.06, S1-03.09, S1-03.10, S1-03.11 (ADR-0010 Accepted) |
| S1-03.02 | [Keycloak smoke: PKCE sign-in, admin client, registration on](S1-03.02-keycloak-smoke-pkce-admin-checks.md) | infra-engineer | 3 | To Do | S1-03.01, S1-03.07, S1-03.10, S1-03.11 |
| S1-03.03 | [Local development guide: Keycloak and config contract](S1-03.03-local-keycloak-docs-and-config-contract.md) | docs-steward | 4 | To Do | S1-03.02, S1-03.08, S1-03.10 |
| S1-03.04 | [Privacy review: synthetic realm and secrets](S1-03.04-privacy-review-local-keycloak.md) | privacy-reviewer | 5 | To Do | S1-03.01, S1-03.02, S1-03.03, S1-03.09, S1-03.10, S1-03.11, S1-03.12 |
| S1-03.05 | [Close S1-03 and ADR-0010 local-service follow-up](S1-03.05-close-s1-03-and-adr-0010-follow-up.md) | docs-steward | 6 | To Do | S1-03.03, S1-03.04 |
| S1-03.06 | [Red acceptance: local stack and discovery scenarios](S1-03.06-red-acceptance-stack-and-discovery.md) | acceptance-author | 1 | To Do | None: can start now. |
| S1-03.07 | [Red acceptance: PKCE sign-in, admin client and registration scenarios](S1-03.07-red-acceptance-sign-in-and-admin.md) | acceptance-author | 1 | To Do | None: can start now. |
| S1-03.08 | [Red acceptance: local development guide scenario](S1-03.08-red-acceptance-docs-config-contract.md) | acceptance-author | 1 | To Do | None: can start now. |
| S1-03.09 | [Hard-rule: EU region only in the stack config](S1-03.09-hard-rule-eu-region-only.md) | acceptance-author | 1 | To Do | None: can start now. |
| S1-03.10 | [Hard-rule: no AWS reference in the stack files](S1-03.10-hard-rule-no-aws-reference.md) | acceptance-author | 1 | To Do | None: can start now. |
| S1-03.11 | [Hard-rule: synthetic personas only in the realm and fixtures](S1-03.11-hard-rule-synthetic-personas-only.md) | acceptance-author | 1 | To Do | None: can start now. |
| S1-03.12 | [Hard-rule: no user-scoped API endpoint](S1-03.12-hard-rule-no-user-scoped-endpoint.md) | backend-engineer | 1 | To Do | None: can start now. |

Status values follow the ticket template. "Ready" means `To Do` with no open blocker. No ticket is `Blocked`, because no Proposed ADR or open decision blocks the local work.
