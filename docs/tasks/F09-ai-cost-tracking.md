---
id: F09
title: AI cost tracking per active user
slice: Foundation
priority: P1
status: todo
depends_on: [F02]
---

# F09 · AI cost tracking per active user

**Slice:** Foundation · **Priority:** P1 · **Status:** todo
**Depends on:** [F02](F02-auth-and-user-scoped-data.md)
**Requirements:** NFR: AI cost per active user per month tracked from day one; Risk: AI cost too high (see [requirements](../requirements.md))

## Context

Cost decides freemium pricing and must be tracked from the first AI call.

## Scope

- Wrap every model call in a client that records user id (hashed), feature, model, tokens/images, latency and estimated cost.
- Emit as structured logs / CloudWatch metrics; monthly cost-per-active-user query.
- Cache tags and results where possible.

## Acceptance criteria

- [ ] Every AI call is attributed to a feature and user.
- [ ] A dashboard or query shows cost per active user per month.
