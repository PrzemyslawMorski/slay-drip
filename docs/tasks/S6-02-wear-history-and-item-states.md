---
id: S6-02
title: "Wore it", wear history and item states
slice: Session 6 – Personalisation
priority: P0
status: todo
depends_on: [F03]
---

# S6-02 · "Wore it", wear history and item states

**Slice:** Session 6 – Personalisation · **Priority:** P0 · **Status:** todo
**Depends on:** [F03](F03-unify-item-model-and-wire-api.md)
**Requirements:** F2.4; F4.2; F3.5 (see [requirements](../requirements.md))

## Context

No wear tracking or item availability.

## Scope

- "Wore it" logs the outfit with a date and bumps `wornCount` / `lastWornAt` on each item.
- Item state toggle: available / in laundry / away-stored (quick action in wardrobe).
- User setting for the N-day no-repeat window.

## Acceptance criteria

- [ ] Unavailable items never appear in recommendations.
- [ ] Wear history visible per item.
