---
id: S5-03
title: Recommendation engine with hard-constraint filter
slice: Session 5 – Recommendation
priority: P0
status: todo
depends_on: [S2-02, S4-01, S4-02, S5-01, S5-02, F09]
---

# S5-03 · Recommendation engine with hard-constraint filter

**Slice:** Session 5 – Recommendation · **Priority:** P0 · **Status:** todo
**Depends on:** [S2-02](S2-02-ai-auto-tagging.md), [S4-01](S4-01-style-profile-and-constraints.md), [S4-02](S4-02-colouring-and-proportions.md), [S5-01](S5-01-outfit-request-ui.md), [S5-02](S5-02-weather-context.md), [F09](F09-ai-cost-tracking.md)
**Requirements:** F3.2; F3.3; F3.5; F3.6; Privacy 10; NFR: p95 ≤ 10 s (see [requirements](../requirements.md))

## Context

Not started.

## Scope

- Deterministic pre-filter: exclude unavailable items and anything violating weather, modesty, adaptive or never-wear rules.
- Model/agent proposes and ranks 3 outfits from the filtered set; prefer under-worn items; skip outfits worn in the last N days (user setting).
- Each outfit gets a 1–2 sentence rationale (occasion, colouring, proportions) and the list of signals used.
- If the wardrobe can't satisfy the request, say so and return a gap suggestion instead.
- Latency budget and streaming of the first result.

## Acceptance criteria

- [ ] 3 outfits returned in ≤ 10 s p95 on the golden set.
- [ ] Hard constraints hold 100% (automated check).
