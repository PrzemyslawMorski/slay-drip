---
id: F06
title: Pin CI tooling and add lint
slice: Foundation
priority: P2
status: todo
depends_on: []
---

# F06 · Pin CI tooling and add lint

**Slice:** Foundation · **Priority:** P2 · **Status:** todo
**Depends on:** —
**Requirements:** — (see [requirements](../requirements.md))

## Context

Workflows use `bun-version: latest` and `lint` is a no-op. Builds aren't reproducible.

## Scope

- Pin Bun, Go and Terraform versions in workflows.
- Add ESLint (with `jsx-a11y`) and `gofmt -l` checks.
- Remove the unused `package-lock.json` (Bun is the package manager) and unused vitest/jest/jsdom deps if `bun test` + happy-dom is the chosen stack.

## Acceptance criteria

- [ ] CI fails on lint/format violations.
- [ ] Only one lockfile in `frontend/`.
