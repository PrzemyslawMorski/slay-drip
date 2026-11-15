# S1-08 · Per-worktree local stack, fully in Docker

**Status:** Draft
**Slice:** Session 1, prerequisite to parallel agent work · **Priority:** P1
**Depends on:** [ADR-0016](../adr/0016-per-worktree-local-stack.md) (Proposed, needs the owner), spike S1-08.01
**Related:** [ADR-0005](../adr/0005-local-cloud-emulation.md), [ADR-0010](../adr/0010-identity-provider-keycloak.md), [ADR-0014](../adr/0014-containerised-dev-tooling.md), [S1-07](S1-07-containerised-dev-tooling.md), [S1-03](S1-03-local-keycloak.md), [local development guide](../local-development.md), [requirements](../requirements.md) (no requirement names local tooling; the closest reference is the local-run rule in CLAUDE.md, see Risks)

## Problem

A new agent worktree cannot run the whole app on its own. Compose uses a fixed project name and fixed host ports, so two worktrees clash. Migrations and the S3 bucket are manual, integration tests use the dev database, Playwright reuses whatever is on port 5173, and the host must have Go and Node. The owner wants any worktree to run the full app, with a test database and a test user, in under 30 seconds, with only Docker and Python on the host.

## Goals

- One command, `python scripts/dev/up.py up`, starts PostgreSQL, S3, Keycloak, the Go API and the PWA dev server for this worktree, from a stopped project with images already built, in at most 30 s.
- Two or more worktrees run at once without a port or compose-project clash and never reach each other's services.
- A dedicated test database `slaydrip_test` is created and migrated on every run; the dev database is never used by tests.
- Go build and tests, the Vite dev server, `npm ci` and Playwright all run in containers. The host needs only Docker and Python (standard library).
- Playwright acceptance tests pass against the worktree's own stack with a synthetic test user.
- No `.env` file is read or created.

## Non-goals

- Production images, deployment, a change of identity provider, or new application features.
- Removing the stack-lifecycle Playwright project (open decision).

## Scope

ADR-0016, a spike, red acceptance features, port allocation, compose parameterisation, the entry script, test database wiring, Vite and Playwright config, a timed verification, the guide, a privacy review and closing docs.

## Design

Decisions are in [ADR-0016](../adr/0016-per-worktree-local-stack.md). What the tickets rely on:

- **Stack file contract.** `.stack/stack.json` (gitignored) at the worktree root, written by `up.py`: `project`, `ports` (`postgres`, `s3`, `keycloak`, `api`, `web`), `urls.host` and `urls.network` (service-name URLs for containers), `env` (every config-contract key), `test_database_url`, `last_up` (per-step seconds, `build_seconds` separate). `SLAYDRIP_STACK_FILE` overrides the path. Readers fail with a clear message when it is missing.
- **Reuse of S1-07.** The Go, Node and Playwright images and the `api`, `web`, `go` and `playwright` compose services come from S1-07.06, .07, .08 and .10. S1-08 adds only per-worktree naming and ports, the entry script, the test database, bucket, realm and secret parameterisation, the Vite proxy, Playwright port handling and the timed run.
- **Docker socket.** Only `up.py` on the host calls docker. The Go, web and Playwright containers join the compose network, mount source only and have no socket (consistent with ADR-0014).
- **Budget.** 30 s covers `up.py up` from a stopped project with all images built, including the cache-hit `compose build`. The first build with no cache (base layers, `go mod download`, `npm ci`, Playwright browsers) is excluded: it is measured and reported separately as `build_seconds`. A lockfile change rebuilds and is also outside the budget. Image tags are not project-prefixed, so a new worktree with the same lockfiles reuses layers built by another.
- **Test user.** The synthetic realm users already in the realm file (`persona.*@example.test`) are the test users. The web origin in the realm follows the worktree.

## Acceptance criteria

```gherkin
Scenario: Cold start of the local stack takes at most 30 seconds
  Given a worktree with no running stack and the stack's images already pulled
  When I run "python scripts/dev/up.py up --budget 10"
  Then the command exits with code 0 within 30 seconds
  And the API, the S3 bucket, the test database and Keycloak all answer their checks

Scenario: No .env file is read
  Given a new worktree with no .env file
  When I run "python scripts/dev/up.py up"
  Then the stack starts and no .env file is read or created
  And every local value comes from compose.yaml or a committed file under infra/dev/

Scenario: Two worktrees run their stacks at the same time without a clash
  Given two worktrees with different paths
  When both stacks are started
  Then each gets its own compose project name and its own ports
  And neither worktree's tests reach the other worktree's services

Scenario: The test database is fresh and migrated on every run
  Given a row was written to the test database in an earlier run
  When I run "python scripts/dev/up.py up"
  Then the test database "slaydrip_test" exists with every migration applied
  And the earlier row is gone and the dev database is untouched

Scenario: Playwright runs against the worktree's own stack with a test user
  Given the stack of this worktree is running
  When I run the Playwright acceptance suite
  Then the suite uses the web and API ports from this worktree's stack file
  And a synthetic test user signs in through the local Keycloak
```

## Quality and compliance

- AI quality bar and hard constraints: not applicable, no AI or ranking is touched.
- Consent, retention and EU-only impact: none. Local stand-ins only, synthetic data only, no AWS.
- Accessibility impact: none, no UI change.
- Security (docs/security.md): no secret beyond the committed throwaway one, no `.env`, no Docker socket in test or app containers, images pinned.

## Test plan

- Unit: port allocation, `testenv` resolution, Vite proxy config.
- Acceptance: the two red feature files (S1-08.02, S1-08.03), green by S1-08.13.
- Measured: S1-08.13 runs three starts from a stopped project and reports median and worst; the first cold build is reported separately.

## Risks and open questions

| Risk or question | Impact | Owner | Mitigation |
| --- | --- | --- | --- |
| Stock Keycloak `start-dev` with realm import takes about 44 s median, so 30 s needs the pre-built Keycloak image and faster health checks | Budget missed | Owner | Spike S1-08.01 (10 s not reachable; 30 s accepted by owner) |
| Keycloak issuer is port-bound and containers cannot use 127.0.0.1 for it | Sign-in fails in containers | Owner | Spike answers; proposal: OIDC_ISSUER_URL as the browser sees it, OIDC_JWKS_URL via the service name, host-resolver mapping in Playwright |
| ADR-0014 says the host needs only Docker; `up.py` needs Python on the host | ADR-0014 amendment | Owner | Owner stated Docker and Python are the host requirements; amend in S1-08.16 |
| S1-08 depends on S1-07.06, .07, .08 and .10 for the Go and Node images and the api, web and Playwright services; S1-07 is not started | Whole of S1-08 waits on S1-07 | Owner | Confirm S1-07 lands first, or merge the two specs |
| S1-07.15 rewrites stack-lifecycle scenarios; whether to remove the stack-lifecycle project is undecided | Playwright config conflict | Owner | S1-08.12 leaves the project unchanged |
| No requirement names local tooling | Traceability gap | Owner | Add one or accept the CLAUDE.md local-run rule as the reference |
| Ownership gaps: `.gitignore`, `docs/local-development.md`, `backend/internal/testenv/`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/vite.config.ts`, `frontend/src/config.ts`, `frontend/playwright.config.ts`, `frontend/package.json` are in no role in `roles.md` | Checker rejects those file lists | Owner | Add the paths to `roles.md` (the planner cannot edit `.claude/`) |
| Shared throwaway secret file touches the ADR-0005 config contract | Secrets handling beyond de-duplication | Owner | Only de-duplicate; no new secret mechanism |

## Tickets

Waves assume ADR-0016 is accepted after S1-08.01. Tickets in a wave run in parallel, each in its own worktree.

| Key | Ticket | Role | Wave | Status | Blocked by |
| --- | --- | --- | --- | --- | --- |
| S1-08.01 | [Spike: can the full stack start in 10 seconds and what does each step cost](S1-08.01-spike-can-the-full-stack-start-in-10-seconds-and-what-does-each-step-c.md) | architect | 1 | To Do | None |
| S1-08.02 | [Red acceptance: cold start budget, no .env and no clash between worktrees](S1-08.02-red-acceptance-cold-start-budget-no-env-and-no-clash-between-worktrees.md) | acceptance-author | 2 | Blocked | ADR-0016 (Proposed), S1-08.01 |
| S1-08.03 | [Red acceptance: fresh test database and Playwright with a test user](S1-08.03-red-acceptance-fresh-test-database-and-playwright-with-a-test-user.md) | acceptance-author | 2 | Blocked | ADR-0016 (Proposed), S1-08.01 |
| S1-08.04 | [Per-worktree project name and port allocation](S1-08.04-per-worktree-project-name-and-port-allocation.md) | infra-engineer | 3 | Blocked | ADR-0016 (Proposed), S1-08.02, S1-08.01 |
| S1-08.10 | [Integration tests use the dedicated test database](S1-08.10-integration-tests-use-the-dedicated-test-database.md) | backend-engineer | 3 | Blocked | ADR-0016 (Proposed), S1-08.03, S1-08.01 |
| S1-08.11 | [Vite proxies /api and takes its port from the stack file](S1-08.11-vite-proxies-api-and-takes-its-port-from-the-stack-file.md) | frontend-engineer | 3 | Blocked | ADR-0016 (Proposed), S1-08.02, S1-08.01 |
| S1-08.07 | [Parameterise compose, the realm and the throwaway secret](S1-08.07-parameterise-compose-the-realm-and-the-throwaway-secret.md) | infra-engineer | 4 | Blocked | ADR-0016 (Proposed), S1-08.01, S1-08.02, S1-08.04 |
| S1-08.12 | [Playwright takes ports from the stack file and starts its own server](S1-08.12-playwright-takes-ports-from-the-stack-file-and-starts-its-own-server.md) | frontend-engineer | 4 | Blocked | ADR-0016 (Proposed), S1-08.03, S1-08.04, S1-08.11, S1-07.07, S1-07.08, S1-08.01 |
| S1-08.09 | [up.py: start, wait, bucket, test database, migrations, stack file](S1-08.09-up-py-start-wait-bucket-test-database-migrations-stack-file.md) | infra-engineer | 5 | Blocked | ADR-0016 (Proposed), S1-08.01, S1-08.03, S1-08.04, S1-08.07, S1-07.06, S1-07.07, S1-07.10 |
| S1-08.13 | [Verify: timed cold start, concurrent worktrees and the Playwright run](S1-08.13-verify-timed-cold-start-concurrent-worktrees-and-the-playwright-run.md) | infra-engineer | 6 | Blocked | ADR-0016 (Proposed), S1-08.07, S1-08.09, S1-08.10, S1-08.11, S1-08.12, S1-07.08, S1-07.10, S1-08.01 |
| S1-08.14 | [Rewrite the local development guide for up.py](S1-08.14-rewrite-the-local-development-guide-for-up-py.md) | infra-engineer | 6 | Blocked | ADR-0016 (Proposed), S1-08.09, S1-08.01 |
| S1-08.15 | [Privacy and supply-chain review: per-worktree local stack](S1-08.15-privacy-and-supply-chain-review-per-worktree-local-stack.md) | privacy-reviewer | 7 | Blocked | ADR-0016 (Proposed), S1-08.04, S1-08.07, S1-08.09, S1-08.10, S1-08.11, S1-08.12, S1-08.13, S1-08.01 |
| S1-08.16 | [Close S1-08 and amend ADR-0005 and ADR-0014](S1-08.16-close-s1-08-and-amend-adr-0005-and-adr-0014.md) | docs-steward | 8 | Blocked | ADR-0016 (Proposed), S1-08.14, S1-08.15, S1-08.01 |

Keys S1-08.05, S1-08.06 and S1-08.08 are unused: they planned Go and Node image targets and compose services that S1-07 already owns (S1-07.06, S1-07.07, S1-07.08, S1-07.10). S1-07 is all To Do or Blocked on main and `compose.yaml` has only database, keycloak and api (no frontend image), so S1-08 depends on those tickets rather than duplicating them. The `S1-07.xx` blockers are listed in each ticket's Dependencies; the S1-07 ticket files were not edited, so they carry no matching `blocks` rows.
