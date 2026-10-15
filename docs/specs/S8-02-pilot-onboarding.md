# S8-02 · Pilot launch and onboarding

| Field | Value |
| --- | --- |
| **Key** | S8-02 |
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

Depends on leadership answers about pilot users and ownership.

**Scope**

- Pilot cohort, invite flow, feedback channel.
- Go-live checklist (DPIA signed, live environment, monitoring, support).

## Acceptance criteria

- [ ] Pilot users onboarded and metrics flowing.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S7-04](S7-04-dpia-inputs.md) | To Do | DPIA inputs and data inventory |
| is blocked by | [S8-01](S8-01-metrics-instrumentation-and-dashboard.md) | To Do | Pilot metrics instrumentation and dashboard |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: Open questions: pilot users, ownership (see [requirements](../requirements.md))
