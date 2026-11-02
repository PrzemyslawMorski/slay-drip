# S1-07 · Containerised development tooling

**Status:** Ready
**Slice:** Session 1, prerequisite to the MCP work (S1-06) · **Priority:** P1
**Depends on:** None. [ADR-0014](../adr/0014-containerised-dev-tooling.md) (Accepted) records the owner's decision.
**Related:** [ADR-0014](../adr/0014-containerised-dev-tooling.md), [S1-06](S1-06-mcp-server-access.md) (blocked by this spec), [ADR-0005](../adr/0005-local-cloud-emulation.md), [ADR-0006](../adr/0006-development-feedback-loops-ports-and-fakes.md), [ADR-0007](../adr/0007-backend-go-and-test-stack.md), [ADR-0003](../adr/0003-gherkin-acceptance-tests-with-playwright.md), [ADR-0009](../adr/0009-frontend-lint-format-and-unit-tests.md), [local development guide](../local-development.md), [requirements](../requirements.md) (F7 through S1-06; no requirement names tooling, see Risks)

## Problem

Go, Node with the Playwright browsers and Python are installed on each developer's host, and each agent worktree inherits whatever that host has. Versions drift, the Go race detector cannot run on the Windows host (ADR-0007), and the MCP work adds more local parts. The owner decided on 2026-11-02 to run all development tooling in Docker, so a host needs only Docker. The decision and options are in ADR-0014. S1-06 waits for this work.

## Goals

- A host with only Docker and Compose v2 can run every development command: Go tests, lint and govulncheck, frontend checks, Playwright acceptance tests and the Python scripts.
- The commands are the same on Windows, macOS and Linux.
- The API and the frontend dev server run from compose against the stand-ins.
- Config keys stay the same as production (ADR-0005). No `.env` file is read.

## Non-goals

- Production images, deployment or Scaleway container registry setup.
- Changing application code, test behaviour or the stand-in services.
- Production images and deployment. (CI does move to the same compose images: S1-07.11.)
- New Python tests for the smoke scripts.

## Scope

- Three tool images (Go, Node with Playwright, Python) and their compose services under a `tools` profile.
- `api` and `web` compose services.
- A discovery note on networking and host performance.
- Red acceptance tests, ADR-0005 and ADR-0007 amendments, a guide rewrite and a review.

## Design

Defaults below are proposals; the Spike S1-07.01 confirms or replaces them.

- **Services.** `go`, `node`, `python` (profile `tools`, not started by `docker compose up`), plus `api` and `web`. Invocation: `docker compose run --rm <service> <command>`.
- **Images.** One per toolchain, pinned by tag. The Node image is based on the Playwright image, tag matching `@playwright/test`. The Go version follows `backend/go.mod`. Tool versions stay pinned in `go.mod` and `package.json`.
- **Caches.** Named volumes for the Go module and build cache and for `node_modules`. Dependencies install inside containers.
- **Config.** The services pass the existing config contract keys. Only hostnames may differ inside the network. Values live in `compose.yaml` or `infra/dev/`.
- **Networking.** The Keycloak issuer is `http://127.0.0.1:8180/...` (ADR-0010). How a container reaches it is the Spike's first question.
- **Stack setup stays on the host (owner decision, 2026-11-02).** The Playwright container gets no Docker socket and the test process never runs `docker compose`. One documented host command starts or stops the stack (`docker compose up -d`, `docker compose down`). The containerised Playwright run only talks to the running stack, headless. The `stack-lifecycle` Playwright project runs `docker compose` from the test process today, so it is excluded from the container run (for example `npm run test:acceptance -- --project=mobile-chromium --no-deps`). Scenario wording is unchanged: "Playwright acceptance tests run in the Playwright container" already says the scenarios run "against the stack", which is the running stack. Spec change note: the scenario's meaning is narrowed to the non-lifecycle project, and the lifecycle scenarios' fate is an open question below.
- **CI (owner decision, 2026-11-02).** CI runs the same compose tool images as local development, headless.
- **Ownership gap.** `docs/local-development.md` and `CLAUDE.md` are owned by no role in `roles.md`, so the guide rewrite is in a Blocked ticket (S1-07.13).

## Acceptance criteria

```gherkin
Scenario: Each toolchain runs in a container with no host install beyond Docker
  Given a host with only Docker and Compose v2 installed
  When a developer runs a Go, Node or Python command through its compose tool service
  Then the command runs in a container and finishes
  And no Go, Node or Python install on the host is used

Scenario: The same commands work on Windows, macOS and Linux hosts
  Given the documented tool commands
  When they are read for each host
  Then every command starts with "docker compose" and uses no shell syntax that differs by host
  And no command needs a Makefile, a shell script or a PowerShell script

Scenario: Go tests run in the Go container
  Given the stand-ins are not running
  When a developer runs "go test ./..." through the Go tool service
  Then the backend unit tests run in the container and report their result
  And "go test -race ./..." also runs there

Scenario: Go lint and vulnerability checks run in the Go container
  Given the Go tool service
  When a developer runs golangci-lint and govulncheck through it
  Then both run in the container with the versions pinned in backend/go.mod
  And a lint finding or a known vulnerability fails the command

Scenario: Frontend checks run in the Node container
  Given the Node tool service with the frontend dependencies installed inside it
  When a developer runs typecheck, lint, format check and unit tests through it
  Then each runs in the container and reports its result
  And no node_modules folder from the host is used

Scenario: Playwright acceptance tests run in the Playwright container
  Given the Node tool service with the Playwright browsers
  When a developer runs "npm run test:acceptance" through it
  Then the acceptance scenarios run in the container against the stack
  And the result is reported as it is on a host install

Scenario: Python scripts run in the Python container
  Given the Python tool service and the local stack running
  When a developer runs the S3 and Keycloak smoke scripts through it
  Then each script runs in the container using only the standard library
  And a passing run ends with its usual OK line

Scenario: The API and frontend run from compose
  Given the compose file
  When a developer starts the "api" and "web" services
  Then the API answers GET /healthz on 127.0.0.1:8080 and the frontend is served on localhost:5173
  And both reach the stand-ins through the same config keys as production

Scenario: No .env file is read
  Given the tool and app services in compose
  When their definitions are inspected
  Then none reads a ".env" file, an "--env-file" option or an "env_file" that points to one
  And every local value comes from the compose file or a committed file under infra/dev/

Scenario: The local stack keeps the production config keys
  Given the services running in containers
  When their environment is listed
  Then every key is a name in the config contract of docs/local-development.md
  And no key exists only for the containerised run
```

## Quality and compliance

- AI quality bar: not applicable.
- Hard constraints: no `.env` read, no AWS, Scaleway regions only, Python-only scripts, synthetic data only.
- Consent, retention and EU-only impact: none. No personal data. DPO review is not needed.
- Accessibility (WCAG 2.1 AA) impact: not applicable. No UI change.
- Supply chain: images pinned by tag, checked date recorded; no Docker socket is mounted into any tool container (checked in S1-07.14).

## Test plan

- Unit / integration: red acceptance scenarios (static, read committed files) turn green per ticket. Live runs through each service are in each ticket's Done when.
- Evals or golden-set checks: not applicable.
- Manual or device checks: the commands run on a Windows host and on a macOS or Linux host with no Go, Node or Python installed. The PRs show the runs.

## Risks and open questions

| Risk or question | Impact | Owner | Mitigation |
| --- | --- | --- | --- |
| No requirement in requirements.md names containerised tooling | The requirement gate has no direct match | Product owner | Decided by the owner (2026-11-02): treated as a prerequisite of F7 and the CLAUDE.md local-run rule. No requirements.md edit |
| Performance target for file watching and tests on Windows and macOS bind mounts | Slow inner loop | Product owner | Open: not decided. Spike S1-07.01 measures; the owner sets the target |
| Docker socket in the Playwright container | Root-equivalent access to the host | Product owner | Decided by the owner (2026-11-02): no socket, stack setup stays on the host. Closed |
| Stack-lifecycle scenarios (S1-03, `local-keycloak-stack.feature`) run `docker compose` from the test process | They cannot run in the Playwright container | Product owner and S1-03 owner | Open: excluded from the container run. Decide whether they are rewritten to check a running stack, or kept as a host step. Not decided here; S1-07.08 notes it |
| Playwright headed or headless in CI | CI cost and debugging | Product owner | Decided by the owner (2026-11-02): headless. Closed |
| CI on the same images or on setup actions | Drift between local and CI | Product owner | Decided by the owner (2026-11-02): CI runs the same compose images. Closed. S1-07.11 now waits only on its real dependencies |
| Tool containers cannot reach `127.0.0.1` stand-ins; issuer must match | Auth smoke and tests fail | Architect | Spike S1-07.01 question 1 |
| `frontend/playwright.config.ts` and `vite.config.ts` have no owning role | A needed config change has no owner | Product owner | Prefer command-line or environment options; stop and report otherwise |
| `docs/local-development.md` and `CLAUDE.md` unowned in `roles.md` | Guide rewrite cannot be listed in a ticket | Product owner | Add them to docs-steward owned paths; S1-07.13 Blocked until then |
| Cross-host scenario (macOS, Linux) cannot be automated here | Only static and manual checks | Infra | Static command check plus manual runs in PRs |
| Python "script tests" are the two smoke scripts only | No separate suite | Infra | Noted in S1-07.09; no new tests in this spec |
| Two tickets edit `compose.yaml` in parallel (07 and 09) | Merge conflicts | Infra | Rebase on whichever merges first |

## Tickets

Breakdown from [tickets-from-spec](../../.claude/skills/tickets-from-spec/SKILL.md). Waves are computed over blockers inside this batch.

| Key | Ticket | Role | Wave | Status | Blocked by |
| --- | --- | --- | --- | --- | --- |
| S1-07.01 | [Spike: container networking, stack setup and host performance](S1-07.01-spike-container-networking-socket-and-performance.md) | architect | 1 | To Do | None |
| S1-07.02 | [Red acceptance: host needs only Docker, no .env, same config keys](S1-07.02-red-acceptance-host-requirements-and-config.md) | acceptance-author | 1 | To Do | None |
| S1-07.03 | [Red acceptance: host-neutral commands and API plus frontend from compose](S1-07.03-red-acceptance-commands-and-app-services.md) | acceptance-author | 1 | To Do | None |
| S1-07.04 | [Red acceptance: Go and frontend checks run in containers](S1-07.04-red-acceptance-go-and-frontend-containers.md) | acceptance-author | 1 | To Do | None |
| S1-07.05 | [Red acceptance: Playwright and Python scripts run in containers](S1-07.05-red-acceptance-playwright-and-python-containers.md) | acceptance-author | 1 | To Do | None |
| S1-07.06 | [Go tool container: tests, lint, govulncheck and migrations](S1-07.06-go-tool-container.md) | infra-engineer | 2 | To Do | S1-07.01, S1-07.02, S1-07.04 |
| S1-07.07 | [Node and Playwright image: typecheck, lint, format and unit tests](S1-07.07-node-and-playwright-tool-container.md) | infra-engineer | 3 | To Do | S1-07.03, S1-07.04, S1-07.06 |
| S1-07.08 | [Run Playwright acceptance tests in the container](S1-07.08-playwright-acceptance-run-in-container.md) | infra-engineer | 4 | To Do | S1-07.05, S1-07.07 |
| S1-07.09 | [Python tool container for the dev scripts](S1-07.09-python-tool-container.md) | infra-engineer | 3 | To Do | S1-07.05, S1-07.06 |
| S1-07.10 | [Run the API and frontend dev server from compose](S1-07.10-api-and-web-services-in-compose.md) | infra-engineer | 4 | To Do | S1-07.02, S1-07.03, S1-07.07, S1-07.09 |
| S1-07.11 | [CI runs the same tool images](S1-07.11-ci-uses-the-same-tool-images.md) | infra-engineer | 5 | To Do | S1-07.06, S1-07.07, S1-07.08, S1-07.09 |
| S1-07.12 | [Amend ADR-0007 and ADR-0005 for containerised tooling](S1-07.12-amend-adrs-for-containerised-tooling.md) | docs-steward | 5 | To Do | S1-07.06, S1-07.10 |
| S1-07.13 | [Rewrite the local development guide and close S1-07](S1-07.13-close-s1-07-and-rewrite-the-guide.md) | docs-steward | 7 | Blocked | S1-07.12, S1-07.14 (owner decision) |
| S1-07.14 | [Privacy and supply-chain review: containerised tooling](S1-07.14-privacy-review-containerised-tooling.md) | privacy-reviewer | 6 | To Do | S1-07.06, S1-07.07, S1-07.08, S1-07.09, S1-07.10, S1-07.11, S1-07.12 |
