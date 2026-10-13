---
id: S5-02
title: Local weather context
slice: Session 5 – Recommendation
priority: P0
status: todo
depends_on: [S1-01]
---

# S5-02 · Local weather context

**Slice:** Session 5 – Recommendation · **Priority:** P0 · **Status:** todo
**Depends on:** [S1-01](S1-01-age-gate-and-consent.md)
**Requirements:** F3.2; Privacy 4 (see [requirements](../requirements.md))

## Context

No weather or location.

## Scope

- EU-friendly weather API called server-side with coarse location (city level), only with location consent.
- Fallback: manual city or no weather, stated in the rationale.

## Acceptance criteria

- [ ] Recommendation input includes today's forecast when consented.
