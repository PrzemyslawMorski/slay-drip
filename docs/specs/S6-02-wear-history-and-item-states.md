# S6-02 · "Wore it", wear history and item states

| Field | Value |
| --- | --- |
| **Key** | S6-02 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 6 – Personalisation |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 6 – Personalisation |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

No wear tracking or item availability.

**Scope**

- "Wore it" logs the outfit with a date and bumps `wornCount` / `lastWornAt` on each item.
- Item state toggle: available / in laundry / away-stored (quick action in wardrobe).
- User setting for the N-day no-repeat window.

## Acceptance criteria

- [ ] Unavailable items never appear in recommendations.
- [ ] Wear history visible per item.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F03](F03-unify-item-model-and-wire-api.md) | To Do | Unify the item/outfit model and wire the frontend to the API |
| blocks | [S6-03](S6-03-taste-profile.md) | To Do | Taste profile feeding ranking |
| blocks | [S8-01](S8-01-metrics-instrumentation-and-dashboard.md) | To Do | Pilot metrics instrumentation and dashboard |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F2.4; F4.2; F3.5 (see [requirements](../requirements.md))
