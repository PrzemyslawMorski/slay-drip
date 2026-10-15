# F09 · AI cost tracking per active user

| Field | Value |
| --- | --- |
| **Key** | F09 |
| **Issue type** | Task |
| **Priority** | High |
| **Status** | To Do |
| **Epic** | Foundation |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Foundation |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

Cost decides freemium pricing and must be tracked from the first AI call.

**Scope**

- Wrap every model call in a client that records user id (hashed), feature, model, tokens/images, latency and estimated cost.
- Emit as structured logs (Scaleway Cockpit, or another EU-hosted metrics store); monthly cost-per-active-user query.
- Cache tags and results where possible.

## Acceptance criteria

- [ ] Every AI call is attributed to a feature and user.
- [ ] A dashboard or query shows cost per active user per month.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F02](F02-auth-and-user-scoped-data.md) | To Do | Authentication and per-user data model |
| blocks | [S2-02](S2-02-ai-auto-tagging.md) | To Do | AI auto-tagging with editable tags |
| blocks | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |
| blocks | [S8-01](S8-01-metrics-instrumentation-and-dashboard.md) | To Do | Pilot metrics instrumentation and dashboard |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: NFR: AI cost per active user per month tracked from day one; Risk: AI cost too high (see [requirements](../requirements.md))
