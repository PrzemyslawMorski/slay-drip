# S6-03 · Taste profile feeding ranking

| Field | Value |
| --- | --- |
| **Key** | S6-03 |
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

Not started.

**Scope**

- Per-user taste profile updated from reactions and wears.
- Ranking uses it; rationale mentions when it did (transparency).
- Eval: simulated feedback on golden personas shows a measurable ranking shift.

## Acceptance criteria

- [ ] Before/after eval shows a ranking shift beyond noise.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S6-01](S6-01-feedback-like-reject.md) | To Do | Like / reject with reasons |
| is blocked by | [S6-02](S6-02-wear-history-and-item-states.md) | To Do | "Wore it", wear history and item states |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F4.3; Workshop #6 done-when (see [requirements](../requirements.md))
