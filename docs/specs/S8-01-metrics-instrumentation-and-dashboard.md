# S8-01 · Pilot metrics instrumentation and dashboard

| Field | Value |
| --- | --- |
| **Key** | S8-01 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 8 – Pilot |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 8 – Pilot |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

No analytics exist.

**Scope**

- Privacy-respecting events: app open → outfit chosen time, outfits viewed, wore it, items worn in 30 days.
- Dashboard for time-to-outfit, wear-through rate, wardrobe utilisation and AI cost per active user.

## Acceptance criteria

- [ ] All three MVP metrics and cost visible for pilot users.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |
| is blocked by | [S6-02](S6-02-wear-history-and-item-states.md) | To Do | "Wore it", wear history and item states |
| is blocked by | [F09](F09-ai-cost-tracking.md) | To Do | AI cost tracking per active user |
| blocks | [S8-02](S8-02-pilot-onboarding.md) | To Do | Pilot launch and onboarding |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: MVP success metrics; Workshop #8 (see [requirements](../requirements.md))
