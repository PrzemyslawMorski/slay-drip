# S5-04 · Flat-lay collage rendering

| Field | Value |
| --- | --- |
| **Key** | S5-04 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 5 – Recommendation |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 5 – Recommendation |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

Outfits are shown as a list of item cards.

**Scope**

- Compose cut-outs into a flat-lay collage (client-side canvas or server-side).
- Alt text describing the outfit for screen readers.

## Acceptance criteria

- [ ] Every recommended outfit renders as a collage on mobile.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S2-03](S2-03-background-removal.md) | To Do | Background removal for flat-lay images |
| is blocked by | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F3.3 (see [requirements](../requirements.md))
