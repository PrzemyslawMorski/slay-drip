# S7-02 · Photo retention toggles and consent revocation

| Field | Value |
| --- | --- |
| **Key** | S7-02 |
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

Not started.

**Scope**

- Toggle raw photo retention; delete any single photo.
- Revoking a consent deletes the data of that type (e.g. revoke body photo → delete raw photo and derived colouring if required).

## Acceptance criteria

- [ ] Each consent revocation has a test proving the data is gone.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S1-01](S1-01-age-gate-and-consent.md) | To Do | 18+ gate and granular consent screens |
| is blocked by | [F04](F04-image-storage-s3.md) | To Do | Image storage in Scaleway Object Storage with presigned uploads |
| blocks | [S7-04](S7-04-dpia-inputs.md) | To Do | DPIA inputs and data inventory |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F6.2; Privacy 3, 4 (see [requirements](../requirements.md))
