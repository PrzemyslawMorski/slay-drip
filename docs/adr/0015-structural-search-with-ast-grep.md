# ADR-0015: Structural search and lint with ast-grep

**Status:** Proposed (product owner to accept)
**Date:** 2026-11-03
**Deciders:** Outfit Planner team (product owner to accept)
**Related:** [ADR-0009](0009-frontend-lint-format-and-unit-tests.md) (ESLint and golangci-lint cover the rest), [ADR-0014](0014-containerised-dev-tooling.md) (tooling moves into containers), [security guide](../security.md) (OWASP A05 injection), [local development guide](../local-development.md)

## Context

ESLint (ADR-0009) and golangci-lint (ADR-0007) check style, types and common bugs. They do not check repo-specific rules such as "no AWS SDK imports" (CLAUDE.md, Scaleway only), "no raw HTML rendering in React" or "no SQL built with `fmt.Sprintf`". Today those rules live only in prose, so they are enforced by review.

[ast-grep](https://ast-grep.github.io/) matches code by its syntax tree for TypeScript, TSX and Go. Its rules are YAML files that are easy to read in review, and each rule can ship with valid and invalid samples.

## Decision

We will use ast-grep for structural checks that the existing linters do not cover:

- The CLI is pinned to `@ast-grep/cli` 0.51.0 and run through `npx --yes -p`. It is not added to `frontend/package.json` or `backend/go.mod`, so the Go and Node toolchains do not change.
- Rules live in `ast-grep/rules/`, with tests in `ast-grep/rule-tests/`. `sgconfig.yml` at the repo root points at both.
- Starter rules: no `@aws-sdk/*` imports in TSX or Go; no `dangerouslySetInnerHTML`; no `fmt.Sprintf` with an SQL verb in the format string.
- Each rule has `error` severity. `ast-grep scan` exits non-zero on any error.
- Rules are added when a repo rule can be expressed as syntax. Rules that need type information, or that check text in UI copy, stay with the linters or with review.

## Options considered

### Option A: ast-grep with pinned npx (chosen)

- Pros: one small YAML rule per check, with tests. Runs on Windows, macOS and Linux with Node alone. No change to the language toolchains.
- Cons: `npx` downloads the binary on first use. The version pin is in the docs and must be bumped by hand.

### Option B: Custom ESLint and golangci-lint rules

- Pros: no new tool. Runs in the existing lint jobs.
- Cons: a Go-analysis plugin for golangci-lint is custom code to maintain. A custom ESLint rule for each check is more code than the YAML rules here, and it covers only TypeScript.

### Option C: Semgrep

- Pros: similar rule style, with a large public rule catalogue.
- Cons: the managed registry sends code metadata to a vendor. The local CLI is also more involved to run with no account, and it is a bigger new dependency than this use needs. The EU-only rule (CLAUDE.md) makes this a separate decision.

### Option D: Text search in CI (grep)

- Pros: no tool.
- Cons: it matches comments and strings, and it cannot express "inside this call".

## Consequences

- Positive: repo rules become checks that run locally and can run in CI. Each rule is tested against samples.
- Negative: a new tool to keep current, and the tool runs through `npx`, so a machine needs Node 22 or later. Rules for Go and TSX need one file each.
- Follow-up work:
  - Add `ast-grep scan` and `ast-grep test` to CI once the containerised tooling of ADR-0014 exists, using the same tool image.
  - Move the pinned CLI into the Node tool image when ADR-0014 lands.

## Compliance check

- [x] EU-only processing: the CLI runs locally. It sends nothing to a vendor, and no rule reads user data.
- [x] Consent and retention impact: none.
- [x] Special-category data impact: none.
- [x] Hard constraints remain hard filters: not applicable to tooling.
- [x] Test data is synthetic: rule samples are short code snippets with no personal data.

## Revisit when

- The rules need type information, which ast-grep does not provide. Use the type-aware linters for those.
- ast-grep changes its license, or the npm package stops being maintained.
