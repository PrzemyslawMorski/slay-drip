# ADR-0016: One per-worktree local stack, started by a single Python entry script

**Status:** Accepted
**Date:** 2026-11-15
**Deciders:** Product owner (goal and 30 s budget set 2026-11-15, accepted 2026-11-15)
**Related:** [S1-08](../specs/S1-08-local-stack.md) (spec and tickets), [ADR-0005](0005-local-cloud-emulation.md), [ADR-0006](0006-development-feedback-loops-ports-and-fakes.md), [ADR-0008](0008-postgresql-data-store-and-migrations.md), [ADR-0010](0010-identity-provider-keycloak.md), [ADR-0014](0014-containerised-dev-tooling.md), [local development guide](../local-development.md)

## Context

A new agent worktree must run the whole app (Go API, PWA, PostgreSQL, S3, Keycloak) and the Playwright suite with no `.env` file, a dedicated test database, and no clash with other worktrees running at the same time. Today:

- `compose.yaml` has the fixed project name `slay-drip-local` and fixed host ports 5432, 8333, 8180 and 8080. A second worktree collides or silently reuses the first one's stack.
- There is no single start command. Migrations and the S3 bucket are manual steps. Integration tests use the dev database `slaydrip` and never reset it.
- Vite is on 5173 with `strictPort` and Playwright reuses any server on 5173 outside CI, so a test run can hit another worktree's code.
- The throwaway secret is duplicated in four files. The Keycloak realm hard-codes `localhost:5173`, and the issuer is port-bound (`127.0.0.1:8180`, ADR-0010).
- ADR-0014 (Accepted) says the host runs `docker compose`, the test process never does, and the host needs only Docker. The owner has now set the host requirements to Docker and Python (standard library). Reconciliation: the host-side entry script is the only code that calls docker. The Go, web and Playwright containers join the compose network and mount source only, with no Docker socket, which is what ADR-0014 asks. The only change to ADR-0014 is that Python joins Docker as a host requirement (amended in S1-08.16).
- Everything runs in containers: Go build and tests, the Vite dev server, `npm ci` and Playwright. S1-07.06, .07, .08 and .10 plan these images and services and none has landed. This ADR does not replace ADR-0014 or S1-07: it builds on them and adds per-worktree naming, ports, the entry script, the test database and the timed budget. S1-08 tickets depend on those S1-07 tickets.

The goal is a start in under 30 s with the images already pulled. Keycloak `start-dev` with realm import is the likely cost; the spike (S1-08.01) found the stock stack takes about 44 s median, so the 10 s goal is not reachable; the owner accepted a 30 s cap, which needs the optimisations listed in the spike note.

## Decision

We will run one local stack per worktree, started by one standard-library Python script, `scripts/dev/up.py` (`up`, `down`, `status`). The script:

1. Derives a compose project name from the worktree path (`slaydrip-<8 hex of path hash>`) and a block of five host ports from the same hash (base 20000 to 29990 in steps of 10: PostgreSQL, S3, Keycloak, API, web). It probes each port and shifts to the next block if one is taken. The result is written to `.stack/stack.json` in the worktree (gitignored, not committed) and reused on later runs.
2. Starts compose with that project name and passes the ports as environment variables to `compose.yaml`, which no longer has a fixed project name, container names or host ports.
3. Waits for health, creates the S3 bucket, creates a migrated template database, and creates the dedicated test database `slaydrip_test` from it on every run (fresh, `CREATE DATABASE ... TEMPLATE`). Migrations use the pinned golang-migrate, so the schema is the one ADR-0008 describes.
4. Renders the Keycloak realm with the worktree's web origin and issuer, then writes every config-contract key and the test database URL into `stack.json`. The test user is a synthetic realm user already in the realm file.
5. Builds the S1-07 images (a cache hit is a no-op; image tags are not project-prefixed, so worktrees with the same lockfiles share layers) and starts the S1-07.10 `api` and `web` services. `up.py go` and `up.py e2e` run the S1-07.06 and S1-07.07 services on the stack network.
6. Prints the elapsed time and fails if the budget is exceeded when `--budget 10` is given.

The Vite dev server proxies `/api` to the worktree's API port, so the browser needs no CORS setting. Vite and Playwright read their ports from `stack.json` (or `SLAYDRIP_STACK_FILE`); both fail if the file is missing, and Playwright never reuses a server it did not start. The config keys stay the production names (ADR-0005); only local values differ per worktree.

**Budget and measurement.** 30 s wall clock from running `python scripts/dev/up.py up` with all images already pulled and built (including the cache-hit `compose build`, which is inside the budget) and the project not running, to the last check passing (API `/healthz`, a Keycloak token for the test user, the S3 bucket present, test database migrated). `up.py` prints per-step timings; S1-08.13 measures it from a stopped project, three runs, and records the median and worst. The first build with no cache (base layers, `go mod download`, `npm ci`, Playwright browsers), and any rebuild after a lockfile change, is excluded from the budget and reported separately as `build_seconds`.

## Options considered

### Option A: Testcontainers in each test run

- Pros: per-test isolation, ports allocated for free.
- Cons: needs the Docker socket in the test process, which ADR-0014 rules out. It does not run the whole app (PWA, Keycloak for a browser) and adds a Go-only and a Node-only variant.

### Option B: One shared stack for all worktrees

- Pros: one start, no port logic.
- Cons: worktrees share data and a test database, so concurrent runs corrupt each other. Breaks "one worktree, one agent" isolation.

### Option C: Compose profiles only, fixed ports

- Pros: no new script.
- Cons: does not fix port or project clashes, bucket and migration steps, or the test database.

### Option D: Per-worktree stack with an entry script (chosen)

- Pros: isolation by construction, one command, same config keys, no `.env`.
- Cons: one more script to maintain, and a port hash that can still need a shift.

## Consequences

- Positive: a worktree starts the full app with one command. Concurrent worktrees do not clash. Playwright tests the code in its own worktree. Secret duplication can be reduced to one committed file.
- Negative: the first build per machine is slow and unbudgeted. Containers cannot reach Keycloak at `127.0.0.1`, so the issuer must work for both the browser and in-network clients (proposal: issuer as the browser sees it, JWKS URL by service name; the spike decides). The Keycloak issuer URL now differs per worktree (the realm and the API config follow `stack.json`). Python becomes a host requirement beside Docker (owner-stated; amends ADR-0014). Each stack uses memory (Keycloak is large), so many worktrees at once is limited by the machine.
- Follow-up work: [S1-08](../specs/S1-08-local-stack.md) and its tickets. Amend ADR-0005 and ADR-0014 when this is accepted (the S1-07.15 stack-lifecycle rewrite may be superseded).

## Compliance check

- [x] EU-only processing: only local stand-ins; no cloud service added, no AWS.
- [x] Test data is synthetic: only the existing `*@example.test` realm users.
- [x] Secrets: no `.env` read or created; throwaway local values only, in a committed file under `infra/dev/`.

## Revisit when

The 30 s budget is missed in the spike or by the measured run, the application stack or identity provider changes, or CI moves to a different stack runner.

## Amendment 2026-11-15

The owner dropped the 30 s start-up cap for this MVP ("no time constraints, smaller MVP, get the build working"). The Context, Decision (budget paragraph and step 6) and Consequences above are unchanged as history. For the MVP:

- The 30 s budget is removed. The timing gate is not applied to `up.py` or to S1-08.13 for the MVP.
- 30 s stays the target for a later iteration. Revisit it when that iteration is scheduled.
- The spike results stand (S1-08.01, [discovery note](../discovery/2026-11-15-local-stack-startup-budget.md)): the stock stack takes about 44 s median, so 10 s is not reachable.
- Unchanged: per-worktree project names and ports, the single entry script, the test database, and the requirement that the concurrency and Playwright checks pass.

This amendment does not change the status, which stays Accepted.

## Amendment 2026-11-17

For PR #60, the owner approved a two-minute cold-start acceptance budget for nightly integration, replacing the previous 30 s target and the uncapped MVP amendment. The executable acceptance and S1-08.02 now require `up.py up --budget 120` to exit successfully within 120 s wall clock, including cache-hit image builds. All API, S3, database and Keycloak readiness checks, credential provenance checks and concurrent-worktree isolation checks remain required. Startup optimisations are retained; historical timings above are not evidence of meeting this revised budget.
