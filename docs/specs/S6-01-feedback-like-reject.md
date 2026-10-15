# S6-01 · Like / reject with reasons

| Field | Value |
| --- | --- |
| **Key** | S6-01 |
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

Only a `favorite` boolean exists on outfits.

**Scope**

- Like / reject on each recommended outfit with optional reason (colour, fit, vibe, not for this occasion).
- Store as events linked to request context.

## Acceptance criteria

- [ ] Every reaction is stored with its context.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |
| blocks | [S6-03](S6-03-taste-profile.md) | To Do | Taste profile feeding ranking |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F4.1 (see [requirements](../requirements.md))
