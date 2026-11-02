# ADR-0014: Containerised development tooling, one image per toolchain

**Status:** Accepted
**Date:** 2026-11-02
**Deciders:** Product owner ("yes all in docker", 2026-11-02)
**Related:** [S1-07](../specs/S1-07-containerised-dev-tooling.md) (spec and tickets), [S1-06](../specs/S1-06-mcp-server-access.md) (blocked by this work), [ADR-0005](0005-local-cloud-emulation.md) (compose stand-ins, config contract), [ADR-0006](0006-development-feedback-loops-ports-and-fakes.md) (feedback loops), [ADR-0007](0007-backend-go-and-test-stack.md) (Go tooling), [ADR-0003](0003-gherkin-acceptance-tests-with-playwright.md) (Playwright), [ADR-0009](0009-frontend-lint-format-and-unit-tests.md) (frontend tooling), [local development guide](../local-development.md)

## Context

ADR-0005 put the cloud stand-ins (PostgreSQL, S3, Keycloak) in Docker Compose. Everything else still runs on the host. The local development guide asks every developer to install Python 3.10 or later, Go 1.27.3 or later, and Node with the Playwright browsers. Agents in parallel worktrees need the same toolchains.

Host installs have already caused drift and gaps:

- ADR-0007 notes that `go test -race` needs cgo, which is not set up on the Windows development machine, so the race detector runs only in CI.
- Playwright browsers, Python from the Store stub and the Go toolchain download each fail differently per machine.
- The MCP work (S1-06) adds more local moving parts, and each worktree needs them.

The scripts under `scripts/dev/` must stay Python with the standard library only (CLAUDE.md). The local stack must keep the same config keys as production (ADR-0005). No personal data is involved: this is tooling, with synthetic data only.

## Decision

We will run all development tooling in Docker containers, so a developer's host needs only Docker with Compose v2. There is one image per toolchain: **Go** (`go test`, `go vet`, golangci-lint, govulncheck, golang-migrate), **Node with Playwright** (Vite, ESLint, Prettier, Vitest, `tsc`, Playwright and its browsers) and **Python** (the `scripts/dev/` scripts). They sit beside the existing stand-ins in `compose.yaml`. The API and the frontend dev server also run from compose.

## Options considered

### Option A: Host tooling with a documented install list

- Pros: fastest file watching and test runs on every host. No Docker layer to debug.
- Cons: this is the status quo. Versions drift, Windows lacks cgo, each machine breaks differently, and agents in new worktrees inherit whatever the host has.

### Option B: One container per tool

- Pros: each image is minimal and pinned on its own.
- Cons: a dozen images and wrapper commands. The Go tools share a module cache and a toolchain, so splitting them gains nothing.

### Option C: One dev image with all tools

- Pros: one image to build and document.
- Cons: Go, Node with browsers and Python in one image is large, slow to rebuild, and a bump to one toolchain invalidates all of them. Playwright's browsers want the vendor base image.

### Option D: One image per toolchain, plus the existing stand-ins (chosen)

- Pros: matches how each ecosystem pins and caches its tools. Each image is rebuilt only when its own toolchain changes. Every command is `docker compose run --rm <service> <command>`, identical on Windows, macOS and Linux.
- Cons: three images to maintain and pin. Cross-container networking needs care (see Consequences).

## Consequences

- Positive: a host needs only Docker. The same commands work on every host and in every worktree. `go test -race` becomes possible on Windows hosts, because it runs in the Linux Go container (ADR-0007 follow-up). No `.env` file is needed or read.
- Negative:
  - **Windows and macOS file watching and speed.** Bind mounts through Docker Desktop are slower, and file-change events may not reach the container. Vite and test runs may need polling, a named volume for `node_modules`, or the repo inside WSL 2. The performance target is not decided (see S1-07 open questions).
  - **Playwright browsers.** They come from the pinned Playwright base image, whose tag must match `@playwright/test` in `frontend/package.json`. A Playwright upgrade is also an image upgrade.
  - **Networking.** Tool containers cannot reach the stand-ins at `127.0.0.1`. The Keycloak issuer is `http://127.0.0.1:8180/...` (ADR-0010), so the in-container route is a spike (S1-07.01). Config keys stay the same as production, only local values may differ.
  - **Stack setup stays on the host.** The owner decided (2026-11-02) that the Playwright container gets no Docker socket and the test process never runs `docker compose`. One documented host command starts or stops the stack (`docker compose up -d`, `docker compose down`), and the containerised Playwright run only talks to the running stack. Root-equivalent socket access is therefore not needed. The owner decided (2026-11-02) that the stack-lifecycle scenarios, which today run `docker compose` from the test process (`frontend/tests/support/keycloak-stack.ts`), are rewritten to check a stack that is already running. Tests only check that the running stack answers, so the container run covers the whole acceptance suite (S1-07.15).
  - **CI.** The owner decided (2026-11-02) that CI runs the same compose tool images as local development, so a green local run means a green CI run. `.github/workflows/` moves from setup actions to those images in S1-07.11.
  - **Playwright in CI runs headless.** Decided by the owner on 2026-11-02.
  - ADR-0007's "tests run in the inner loop with no Docker" is amended: the inner loop still uses fakes and needs no stand-ins, but the test process itself runs in a container.
- Follow-up work: [S1-07](../specs/S1-07-containerised-dev-tooling.md) and its tickets. S1-06 stays blocked until S1-07 is done.

## Compliance check

- [x] EU-only processing: no new vendor and no data leaves the machine. Base images are pulled from public registries at build time and carry no user data. Production images and regions are out of scope.
- [x] Test data is synthetic: unchanged.
- Consent, special-category and hard-constraint impact: none. No personal data is touched, so no DPO review is needed.

## Revisit when

Windows or macOS performance makes the inner loop unusable, Docker licensing changes for the team, or CI and production images are decided (supersede or amend then).
