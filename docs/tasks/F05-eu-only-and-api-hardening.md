---
id: F05
title: Fail-closed EU config and API hardening
slice: Foundation
priority: P1
status: todo
depends_on: []
---

# F05 · Fail-closed EU config and API hardening

**Slice:** Foundation · **Priority:** P1 · **Status:** todo
**Depends on:** —
**Requirements:** Privacy 2; Privacy 5 (see [requirements](../requirements.md))

## Context

`config/environment.go` falls back to `us-east-1` when `AWS_REGION` is missing. Handlers return raw `err.Error()` to clients, CORS is `*`, and create endpoints require the client to send an `id`.

## Scope

- Fail startup if region is not an approved EU region (allow-list).
- Log internal errors; return generic messages + a correlation id.
- Restrict CORS to the CloudFront domain (and localhost in dev).
- Generate IDs server-side (UUID) and validate request bodies (size, enums).
- Add `go test ./...` and `go vet` to the lambda workflow; add first handler unit tests.

## Acceptance criteria

- [ ] Lambda refuses to start outside the EU allow-list.
- [ ] No DB error text in API responses.
- [ ] Backend tests run in CI.
