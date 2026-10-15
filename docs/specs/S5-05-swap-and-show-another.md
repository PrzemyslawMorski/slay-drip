# S5-05 · Swap a piece / show me another

| Field | Value |
| --- | --- |
| **Key** | S5-05 |
| **Issue type** | Story |
| **Priority** | High |
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

Not started.

**Scope**

- Per-item swap keeps the rest of the outfit and re-checks constraints.
- Per-outfit "show me another" excludes already-shown combos.

## Acceptance criteria

- [ ] Swaps never violate hard constraints.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F3.4 (see [requirements](../requirements.md))
