# S6-04 · Gap insights

| Field | Value |
| --- | --- |
| **Key** | S6-04 |
| **Issue type** | Story |
| **Priority** | High |
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

- Compute 1–3 generic items (no brands or links) that unlock the most new valid outfits, with the count.
- Respect hard constraints and never-wear preferences.

## Acceptance criteria

- [ ] Insight shows item + count; count is reproducible.

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

Requirements: F5.1; F3.6 (see [requirements](../requirements.md))
