# ADR-0007: Backend in Go, with the standard `testing` package and hand-written fakes

**Status:** Accepted
**Date:** 2026-10-21
**Deciders:** Outfit Planner team (product owner to confirm)
**Related:** [ADR-0006](0006-development-feedback-loops-ports-and-fakes.md) (feedback loops, ports and fakes), [ADR-0003](0003-gherkin-acceptance-tests-with-playwright.md) (Playwright acceptance tests), [ADR-0005](0005-local-cloud-emulation.md) (local cloud emulation), [CLAUDE.md](../../CLAUDE.md) (Platform decisions, Quality bar for AI features)

## Context

CLAUDE.md requires a stack decision to be recorded as an ADR before code depends on it. The application stack was left open. ADR-0006 depends on it, because its port conventions and contract tests need a test framework.

Two parts of the test stack are already decided:

- **End-to-end tests** use Playwright, with Gherkin acceptance tests (ADR-0003).
- **Local and cloud loops** follow ADR-0006: fakes in the inner loop, real local engines in the integration loop, and a shared Scaleway dev project for the cloud loop.

The backend language is now decided: **Go**. What remains is the backend's test and tooling stack, and it should use what the Go ecosystem already treats as standard, so that new contributors recognise it immediately.

## Decision

We will build the backend in **Go**, using the **standard `testing` package** for all backend tests, with **`testify`** for assertions and **hand-written fakes** for ports (no mock generator).

- **Language and build:** Go 1.27.3, the current stable release at the time the module was created. The module is `slaydrip/backend` in `backend/`. The version is pinned in `go.mod`, which also makes the toolchain download itself. Go 1.27.0 has seven standard-library vulnerabilities fixed in 1.27.2 and 1.27.3, which `govulncheck` reported, so the module must not go below 1.27.3.
- **Project tooling:** the common Go setup, pinned in `go.mod` through `tool` directives so that versions live in one file.
  - `golangci-lint` v2.15.0 for linting and formatting (`gofmt`, `goimports`), configured in `backend/.golangci.yml`.
  - `govulncheck` v1.9.0 for known vulnerabilities in dependencies and standard library, run locally and in CI.
  - `golang-migrate` v4.20.1 for migrations, run through `go run` with the `postgres` build tag (ADR-0008).
  - No task runner. The commands are written out in the backend table in `docs/local-development.md`, which is the single source. `make` is not installed on the development machine, and a Makefile would duplicate that table.
- **Unit and domain tests:** `testing` with table-driven tests. Assertions use `testify`'s `require` (stops the test on failure) and `assert` (reports and continues).
- **Fakes:** each port has a hand-written in-memory fake, as ADR-0006 requires. We do not use `gomock` or `mockery`. Fakes are plain structs that implement the port's interface, which keeps them readable and avoids generated code that needs regenerating.
- **Contract tests:** one test suite per port, parameterised over the fake and the real adapter. The real-adapter run is gated by build tag, see below.
- **Integration tests:** build tag `integration` (`//go:build integration`). They run with `go test -tags=integration ./...` against the services in `compose.yaml`, with endpoints and credentials read from the config contract in `docs/local-development.md`. Testcontainers is not used, because `compose.yaml` is the single source for local services.
- **Race and lint checks:** `go test -race` runs in CI on Linux, because the race detector needs cgo, which is not set up on the Windows development machine. `golangci-lint` runs with the standard linters plus `bodyclose`, `errorlint`, `gosec`, `misspell` and `revive`.
- **End-to-end tests:** Playwright (ADR-0003), run against the full stack. They are not written in Go.

Tests run in the inner loop with no Docker. Integration tests need the compose stack. Cloud-loop tests use the same suites as integration, pointed at the Scaleway dev project.

## Options considered

### Option A: Go with `testing` and `testify` (chosen)

- Pros: the standard library is the default for Go. `testify` is the most widely used assertion library in the ecosystem. Hand-written fakes match the ports-and-fakes approach and need no code generation.
- Cons: `testify` adds a dependency. Some teams prefer assertions only from the standard library, which is a reasonable alternative.

### Option B: Go with Ginkgo and Gomega (rejected)

- Pros: BDD-style syntax, which fits the Gherkin habit from ADR-0003.
- Cons: a second test DSL that Go developers must learn. Gherkin already covers the acceptance layer in Playwright, so a second BDD layer in Go duplicates it.

### Option C: Go with `gomock` or `mockery` (rejected)

- Pros: generated mocks stay in sync with interfaces automatically.
- Cons: generated code to maintain. Mocks check call sequences, not behaviour. ADR-0006 needs fakes that behave like the real service, which hand-written fakes do better and contract tests can check.

### Option D: Testcontainers for integration tests (rejected for now)

- Pros: each test run gets its own containers. No separate compose step.
- Cons: duplicates the service definitions already in `compose.yaml`, so the local stack and the test stack could drift. Revisit if per-test isolation becomes necessary.

## Consequences

- Positive: a recognisable Go test setup with no custom tooling. Fakes and contract tests follow the ports-and-fakes approach in ADR-0006. Integration tests reuse the compose stack, so there is one definition of the local services.
- Negative: `testify` is an extra dependency. Hand-written fakes take more effort than generated mocks. Integration tests need Docker running.
- Follow-up work:
  - Create the first port, storage, with its fake and contract test template. Record the module layout in the spec.
  - Set up CI for `golangci-lint`, `govulncheck`, `go test -race` and `go test -tags=integration` on Linux. CI config is not written yet.
  - PostgreSQL in `compose.yaml` and the migration tool are done (ADR-0008).

## Compliance check

- [x] EU-only processing. The stack runs locally or on Scaleway in allowed regions. No test tool sends data to a vendor.
- [x] Consent and retention impact (granular, revocable). Not applicable: tests use synthetic data only.
- [x] Special-category data impact (modesty and adaptive fields). Synthetic personas only in fixtures.
- [x] Hard constraints remain hard filters. Hard-constraint tests run in the inner loop with the standard `testing` package, with no build tag, so they run on every change.
- [x] Test data is synthetic. The stack adds no test data source.

## Revisit when

- The Go version or a dependency has a security issue that requires a change.
- Fakes become hard to maintain against the real ports, which would make a generator worth reconsidering.
- Integration tests need per-test isolation that compose cannot give, which would reopen Option D.
- Playwright and Go test reporting need to be unified in CI.
