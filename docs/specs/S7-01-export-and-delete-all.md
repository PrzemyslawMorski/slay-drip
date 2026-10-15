# S7-01 · Export all data and delete account

| Field | Value |
| --- | --- |
| **Key** | S7-01 |
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

- Export: JSON + images as a zip via presigned download.
- Delete everything in one action: database records, Object Storage objects (both buckets), identity-provider user, consents.
- Define and document the backup erasure window (database backups, Object Storage versioning).

## Acceptance criteria

- [ ] After delete, no records or objects remain for the user (integration test).

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F02](F02-auth-and-user-scoped-data.md) | To Do | Authentication and per-user data model |
| is blocked by | [F04](F04-image-storage-s3.md) | To Do | Image storage in Scaleway Object Storage with presigned uploads |
| blocks | [S7-04](S7-04-dpia-inputs.md) | To Do | DPIA inputs and data inventory |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F6.1; Privacy 6 (see [requirements](../requirements.md))
