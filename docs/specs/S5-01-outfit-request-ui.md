# S5-01 · Outfit request: occasion presets and free text

| Field | Value |
| --- | --- |
| **Key** | S5-01 |
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

`OutfitCreator` is a manual picker.

**Scope**

- Request screen: presets (interview, office, date, wedding guest, weekend, travel) + optional free-text mood/constraint.
- Keep manual outfit building as a secondary path.

## Acceptance criteria

- [ ] A request can be submitted in two taps.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F03](F03-unify-item-model-and-wire-api.md) | To Do | Unify the item/outfit model and wire the frontend to the API |
| blocks | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F3.1 (see [requirements](../requirements.md))
