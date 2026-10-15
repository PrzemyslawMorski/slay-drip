# S7-04 · DPIA inputs and data inventory

| Field | Value |
| --- | --- |
| **Key** | S7-04 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 7 – Trust hardening |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 7 – Trust hardening |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

A DPIA is required before any real user data is collected.

**Scope**

- Data inventory: every field, store, region, retention and processor.
- Vendor DPA list (zero retention, no training).
- Hand to DPO for the special-category question.

## Acceptance criteria

- [ ] `docs/dpia-inputs.md` reviewed by DPO.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S7-01](S7-01-export-and-delete-all.md) | To Do | Export all data and delete account |
| is blocked by | [S7-02](S7-02-retention-toggles-and-consent-revocation.md) | To Do | Photo retention toggles and consent revocation |
| blocks | [S8-02](S8-02-pilot-onboarding.md) | To Do | Pilot launch and onboarding |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: Privacy 1; GDPR Art. 9 note; Open question: DPO review (see [requirements](../requirements.md))
