# S5-02 · Local weather context

| Field | Value |
| --- | --- |
| **Key** | S5-02 |
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

No weather or location.

**Scope**

- EU-friendly weather API called server-side with coarse location (city level), only with location consent.
- Fallback: manual city or no weather, stated in the rationale.

## Acceptance criteria

- [ ] Recommendation input includes today's forecast when consented.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S1-01](S1-01-age-gate-and-consent.md) | To Do | 18+ gate and granular consent screens |
| blocks | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F3.2; Privacy 4 (see [requirements](../requirements.md))
