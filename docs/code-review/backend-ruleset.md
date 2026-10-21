# Backend ruleset (Go)

Applies to `backend/`. Stack decisions: [ADR-0007](../adr/0007-backend-go-and-test-stack.md) (Go, `testing`, `testify`, fakes) and [ADR-0008](../adr/0008-postgresql-data-store-and-migrations.md) (PostgreSQL, pgx, golang-migrate). Tests follow [tdd.md](tdd.md). Project-wide hard rules are in [CLAUDE.md](../../CLAUDE.md) and [security.md](../security.md); the convention files in this folder cover them in detail.

Level: **Blocking** rules fail the review. **Advisory** rules are reported and may be deferred with a reason.

## 1. Language and build

| ID | Rule | Level |
| --- | --- | --- |
| BE-01 | Go version is pinned in `go.mod` and is at least 1.27.3 (see ADR-0007). | Blocking |
| BE-02 | `gofmt` and `goimports` are clean. The formatter runs through `golangci-lint`. | Blocking |
| BE-03 | `go mod tidy` leaves no diff. `go.sum` is committed with every dependency change. | Blocking |
| BE-04 | Tools are pinned through `tool` directives in `go.mod`. No `go install @latest`. | Blocking |
| BE-05 | Every new dependency is reviewed for maintenance, licence, size and whether it sends data anywhere (security guide §12). Note the review in the PR. | Blocking |
| BE-06 | Code follows [Effective Go](https://go.dev/doc/effective_go) and the [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments). | Advisory |

## 2. Lint and static checks

The lint config is `backend/.golangci.yml`: the `standard` linters plus `bodyclose`, `errorlint`, `gosec`, `misspell` and `revive`.

| ID | Rule | Level |
| --- | --- | --- |
| BE-10 | `golangci-lint run` passes with no new issues. Do not add `//nolint` without a reason on the same line. | Blocking |
| BE-11 | `//nolint` for `gosec` or `errcheck` needs a comment explaining why it is safe. | Blocking |
| BE-12 | `govulncheck ./...` passes. A known vulnerability in a reachable call path blocks the change. | Blocking |
| BE-13 | Do not add a linter exclusion to `.golangci.yml` to make a change pass. Propose it in the PR with a reason. | Blocking |

## 3. Tests

| ID | Rule | Level |
| --- | --- | --- |
| BE-20 | Unit tests use the standard `testing` package. Assertions use `testify` (`require` to stop, `assert` to continue). | Blocking |
| BE-21 | Table-driven tests for functions with several inputs. Use `t.Run` with a name per case. | Advisory |
| BE-22 | Each port (interface) has a hand-written in-memory fake and a contract test that runs against both the fake and the real adapter (ADR-0006, ADR-0007). | Blocking |
| BE-23 | Real-service tests carry `//go:build integration` and run with `go test -tags=integration ./...` against `compose.yaml`. They do not run in the inner loop. | Blocking |
| BE-24 | Hard-constraint and hard-rule tests have no build tag, so they run on every `go test ./...`. | Blocking |
| BE-25 | `go test -race ./...` passes. CI runs it on Linux. | Blocking |
| BE-26 | Use `t.Parallel()` in tests that do not share state. Tests must pass with `-count=2`. | Advisory |
| BE-27 | Do not mock with generators (`gomock`, `mockery`). Use fakes (ADR-0007). | Blocking |
| BE-28 | Tests do not sleep. Use channels, `require.Eventually` with a short bound, or injected clocks. | Blocking |

## 4. Errors, context and logging

| ID | Rule | Level |
| --- | --- | --- |
| BE-30 | Wrap errors with context using `%w`. Check with `errors.Is` and `errors.As`, never by comparing strings. | Blocking |
| BE-31 | Do not ignore errors. `_ =` is allowed only with a comment saying why. | Blocking |
| BE-32 | Every function that does I/O takes a `context.Context` as its first argument and passes it on. Do not store a context in a struct. | Blocking |
| BE-33 | Every outbound call (database, storage, AI, HTTP client) has a timeout (security guide §6). | Blocking |
| BE-34 | Handlers return a generic message and a correlation ID to the client. The internal error is logged with that ID. No SQL, stack traces or database errors reach the client (F05). | Blocking |
| BE-35 | Logs use the structured logger and log events, not content. Never log emails, names, body data, free text, photos, tokens, authorisation headers, prompts or model output (security guide §10). | Blocking |
| BE-36 | `panic` is not used for request-handling errors. Recover at the server boundary only. | Blocking |

## 5. HTTP API

| ID | Rule | Level |
| --- | --- | --- |
| BE-40 | Every route requires a verified token unless it is a health check or CORS preflight. Deny by default (security guide §5). | Blocking |
| BE-41 | User identity comes only from the verified token, never from the body, query or a client header. | Blocking |
| BE-42 | Every query on user data filters by owner. A request for another user's record returns 404, not 403. A test covers cross-user access (A cannot read, list or change B's data). | Blocking |
| BE-43 | Request bodies have a size limit, typed fields and an enum check. Write endpoints reject unknown fields. | Blocking |
| BE-44 | Server generates IDs (UUID). Create endpoints do not accept client-supplied IDs. | Blocking |
| BE-45 | Responses with personal data send `Cache-Control: no-store`. | Blocking |
| BE-46 | CORS allows only the app origin and localhost in dev. Never `*` on user data endpoints. | Blocking |
| BE-47 | Authentication and AI-backed endpoints are rate-limited. | Blocking |
| BE-48 | Consent is checked server-side before the handler reads or writes that data type. The UI check does not count. | Blocking |
| BE-49 | Sign-up enforces 18+ on the server. A test sends an under-18 request directly to the API (security guide §2). | Blocking |

## 6. Data and SQL

| ID | Rule | Level |
| --- | --- | --- |
| BE-50 | SQL uses parameterised queries only. No string-built SQL, including `fmt.Sprintf` into a query. | Blocking |
| BE-51 | Migrations are numbered, forward-only and checked in. Do not edit an applied migration. | Blocking |
| BE-52 | Revoking consent deletes the data for that type, in the same change that adds the consent check (security guide §3). | Blocking |
| BE-53 | Use transactions for multi-statement writes. Close rows and transactions with `defer`. | Blocking |
| BE-54 | Database access goes through a port with an adapter. Handlers do not call the database driver directly. | Blocking |
| BE-55 | Database connections, pools and timeouts come from config, not hard-coded values. | Advisory |

## 7. Images and AI

| ID | Rule | Level |
| --- | --- | --- |
| BE-60 | Uploaded images are re-encoded to strip EXIF, the real type is checked from content, and size is limited before storage (security guide §7). Each rule has a test. | Blocking |
| BE-61 | Hard constraints (availability, weather, modesty, adaptive) are filters that run after generation and before the response. They are not weights (CLAUDE.md). | Blocking |
| BE-62 | Model output is not trusted to choose tools, change permissions or write to other users' data. | Blocking |
| BE-63 | AI calls log model name, version, token count and cost per user (F09). They do not log prompt or output text. | Blocking |

## 8. Configuration and secrets

| ID | Rule | Level |
| --- | --- | --- |
| BE-70 | No secrets in code, config files or tests. Read them from the environment (Scaleway container environment in production). | Blocking |
| BE-71 | The API refuses to start outside the allowed EU regions (`fr-par`, `nl-ams`, `pl-waw`). A test covers the refusal (F05). | Blocking |
| BE-72 | No AWS SDK, CLI or config (CLAUDE.md). | Blocking |
| BE-73 | Config is read once at start-up and validated. Missing required values stop the process with a clear message. | Advisory |

## 9. Reviewer checklist

- [ ] `go test ./...`, `go test -race ./...` and `go test -tags=integration ./...` pass for the affected packages.
- [ ] `golangci-lint run` and `govulncheck ./...` pass.
- [ ] New ports have a fake and a contract test (BE-22).
- [ ] Every new route states its auth, owner scope, consent check and cache header.
- [ ] No personal data in logs, errors or test fixtures.
