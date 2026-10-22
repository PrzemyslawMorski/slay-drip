# Agent roles

Every ticket is handed to exactly one role. The role decides which paths the agent may change, which docs it reads first, and what "done" means for it. A ticket whose "Files to change" falls outside its role's owned paths is a breakdown error, and `scripts/check_tickets.py` reports it.

Paths name what exists in the repo today, plus the folder a role creates when the first ticket needs it. Check the real tree before you assign work, and update this file in the same PR if the layout changes.

Every role also obeys these rules, which the ticket does not repeat:

- Never read, search, print, edit or create `.env` files (CLAUDE.md, secrets).
- Never weaken, skip or delete a test to get green (TDD-06, TDD-07).
- Never choose an open decision or accept an ADR (CLAUDE.md, open decisions). Stop and report it.
- Use only synthetic test data (TDD-09).
- Do not commit unless the ticket says so. Work in the ticket's worktree (CLAUDE.md, parallel work).

## Build roles

### `architect`

- **Owns:** `docs/adr/`, `docs/discovery/`
- **Reads first:** the spec's Dependencies and Related lines, `docs/adr/_template.md` or `docs/discovery/_template.md`, the requirement the spec serves.
- **Does:** writes one discovery note or one proposed ADR per Spike ticket. Lists the options with trade-offs and a recommendation. Leaves the status as `Proposed`.
- **Must not:** set an ADR to `Accepted`, pick a vendor, model, region or stack that the spec has not already fixed.
- **Done when:** the note or ADR follows its template, names the open question it answers, and the Spike's time box is respected.

### `acceptance-author`

- **Owns:** `frontend/tests/features/`, `frontend/tests/steps/`, `frontend/tests/support/`
- **Reads first:** `docs/code-review/tdd.md`, `docs/adr/0003-gherkin-acceptance-tests-with-playwright.md`, `docs/code-review/frontend-ruleset.md` section 7.
- **Does:** writes the `.feature` file and step definitions for the scenarios in its ticket, so they fail for the right reason (red). Queries by role, label and visible text (FE-62).
- **Must not:** write application code to make a scenario pass. Edit a scenario's wording without a spec change.
- **Done when:** `npm run test:acceptance` in `frontend/` runs the new scenarios and they fail only because the behaviour is missing.

### `frontend-engineer`

- **Owns:** `frontend/src/components/`, `frontend/src/strings/`, `frontend/src/App.tsx`, `frontend/src/styles.css`, `frontend/src/photos/`
- **Reads first:** `docs/code-review/frontend-ruleset.md`, `docs/code-review/product-guardrails.md`, `docs/code-review/tdd.md`, the ticket's Gherkin scenarios and the feature file they come from.
- **Does:** builds React screens and components, adds strings to `frontend/src/strings/en.ts`, and writes pure logic (validation, photo preparation) with Vitest unit tests.
- **Must not:** touch `frontend/src/storage/` (owned by `data-engineer`), write personal data to `localStorage`, or add a global state library (FE-26).
- **Done when:** the ticket's scenarios pass, `npm run test:unit` and `npm run typecheck` pass, and `npm run lint` shows no new errors.

### `data-engineer`

- **Owns:** `frontend/src/storage/`, `backend/migrations/`, `backend/internal/db/`
- **Reads first:** `docs/adr/0004-on-device-wardrobe-storage.md`, `docs/adr/0008-postgresql-data-store-and-migrations.md`, `docs/code-review/frontend-ruleset.md` section 6, `docs/code-review/backend-ruleset.md` section 4 and its SQL rules.
- **Does:** on-device IndexedDB stores and their migrations (client), PostgreSQL migrations and repository code (server). Adds a store or table only when the governing ADR allows it, otherwise it stops and asks.
- **Must not:** write personal data outside the storage module, change a migration that has already merged (write a new one), or add a data store without an ADR.
- **Done when:** the storage or repository tests pass, a withdraw or delete test covers the store, and `go test ./...` (for backend work) passes.

### `backend-engineer`

- **Owns:** `backend/internal/server/`, `backend/internal/<domain>/` (any new domain package; `db/`, `ai/` and `eval/` belong to other roles), `backend/cmd/api/`
- **Reads first:** `docs/code-review/backend-ruleset.md`, `docs/code-review/age-gate.md`, `docs/code-review/consent-and-gdpr.md` for the route touched, `docs/security.md` sections 5 and 10.
- **Does:** HTTP handlers, domain services, ports and their in-memory fakes, and contract tests (BE-22). Errors wrapped with `%w`, context first, timeouts on every outbound call.
- **Must not:** take user identity from the body or a query string (BE-41), log content (BE-35), or add a mocking generator (BE-27).
- **Done when:** `go test ./...` and `golangci-lint run` in `backend/` pass, and the route's hard-rule tests run without a build tag (BE-24).

### `ai-engineer`

- **Owns:** `backend/internal/ai/` (create when first needed), prompt files under `backend/internal/ai/prompts/`
- **Reads first:** `docs/requirements.md` section "Non-functional & AI quality", `docs/code-review/backend-ruleset.md` section 6 (AI), `docs/code-review/product-guardrails.md`, the spec's Quality and compliance section.
- **Does:** model adapters behind a port, structured output parsing, prompts, and the parsing of model output into typed results. Every call goes through a fake in tests.
- **Must not:** pick the EU-hosted model (open decision, needs a spike and an ADR), send data to a non-EU endpoint, log prompts or model output (BE-35), or let a model decide a hard constraint.
- **Done when:** unit tests run on the fake, the output schema is validated, and the hard-constraint filter test passes at 100%.

### `eval-engineer`

- **Owns:** `backend/internal/eval/`, `testdata/golden/` (synthetic personas and garment images only; if the spec's test plan names another folder, add it here in the same PR)
- **Reads first:** `docs/requirements.md` section "AI quality", the spec's Quality and compliance section, `docs/code-review/product-guardrails.md`.
- **Does:** adds labelled golden items, rubric and accuracy metrics per attribute, and a report that names the attribute and the score.
- **Must not:** use real photos or real people (TDD-09), label items with weight or body-flaw language, or change a threshold to make a result pass.
- **Done when:** the eval runs locally on the stand-ins, prints per-attribute accuracy, and the threshold in the spec is checked in the test.

### `infra-engineer`

- **Owns:** `compose.yaml`, `infra/`, `scripts/dev/`, `.github/workflows/`
- **Reads first:** `docs/local-development.md`, `docs/adr/0005-local-cloud-emulation.md`, `docs/adr/0006-development-feedback-loops-ports-and-fakes.md`, `docs/code-review/eu-only-processing.md`.
- **Does:** adds local stand-ins for Scaleway services (PostgreSQL, S3) in `compose.yaml` and `infra/dev/`, smoke checks in `scripts/dev/`, and CI steps.
- **Must not:** add AWS resources, SDKs or config (CLAUDE.md), use a region other than `fr-par`, `nl-ams` or `pl-waw`, or put a secret in a committed file.
- **Done when:** the stack starts with `docker compose up` locally, the smoke script passes, and the change works with the same config keys as production.

### `docs-steward`

- **Owns:** `docs/specs/`, `docs/adr/`, `docs/discovery/`, `docs/requirements.md` (the Status lines and the `## Tickets` section only; requirement wording only when the user has approved it)
- **Reads first:** `docs/README.md`, `docs/specs/_spec-template.md`, the ticket keys being updated.
- **Does:** keeps the spec and its tickets in step (CLAUDE.md, starting a feature). Updates a Status line when a ticket finishes.
- **Must not:** rewrite a spec's goals, acceptance criteria or decisions, renumber any ID (ADR rule), or change a requirement's meaning without approval.
- **Done when:** every link resolves and the spec's Tickets table matches the ticket files.

## Review roles (read-only)

These roles check work, they do not write code. A review ticket has `Files to change: None (read-only)`.

### `privacy-reviewer`

- **Owns:** nothing (read-only)
- **Reads first:** `docs/security.md` (the PR checklist and sections for the data touched), `docs/code-review/README.md` and the convention files it lists for the change.
- **Does:** checks the change against the blocking rules: age gate, consent before use, revocation deletes, EU-only regions, no identification, body-talk language, no secrets or personal data in logs. Writes the findings in the ticket's Notes or in a PR comment.
- **Must not:** edit files or accept an open decision on the team's behalf (report it as "needs a decision").
- **Done when:** each blocking rule that applies has a finding or a "passes, because" line.

### `a11y-reviewer`

- **Owns:** nothing (read-only)
- **Reads first:** `docs/code-review/frontend-ruleset.md` section 5 (FE-40 to FE-45), `docs/adr/0003-gherkin-acceptance-tests-with-playwright.md`.
- **Does:** checks the axe and keyboard scenarios for the screens the spec changes, and checks contrast, focus style, labels and touch targets against WCAG 2.1 AA.
- **Must not:** disable an axe rule to pass, or edit the scenarios.
- **Done when:** each new screen has a pass or a listed defect with the rule ID.
