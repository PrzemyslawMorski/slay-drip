# F04 · Image storage in Scaleway Object Storage with presigned uploads

| Field | Value |
| --- | --- |
| **Key** | F04 |
| **Issue type** | Task |
| **Priority** | Highest |
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

Images are stored as base64 strings inside IndexedDB. Requirements need encrypted EU storage and a separate, stricter store for body photos.

**Scope**

- Terraform: private Object Storage bucket for wardrobe images (`fr-par`, block public access, encryption at rest) and a **separate** bucket for body photos, with narrower IAM application keys.
- Endpoint issuing presigned PUT/GET URLs scoped to `users/<sub>/...` keys.
- Frontend uploads the compressed image directly to Object Storage, stores only `imageKey` on the item.
- Lifecycle rule for orphaned uploads.

## Acceptance criteria

- [ ] No image bytes go through the SQL database or IndexedDB.
- [ ] A user cannot fetch another user's image key (presign checks ownership).
- [ ] Body-photo bucket is not readable by the wardrobe-tagging role.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F02](F02-auth-and-user-scoped-data.md) | To Do | Authentication and per-user data model |
| blocks | [F03](F03-unify-item-model-and-wire-api.md) | To Do | Unify the item/outfit model and wire the frontend to the API |
| blocks | [S2-01](S2-01-single-item-camera-capture.md) | To Do | Single-item camera capture |
| blocks | [S4-02](S4-02-colouring-and-proportions.md) | To Do | Colouring and proportions from photo or measurements |
| blocks | [S7-01](S7-01-export-and-delete-all.md) | To Do | Export all data and delete account |
| blocks | [S7-02](S7-02-retention-toggles-and-consent-revocation.md) | To Do | Photo retention toggles and consent revocation |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: Privacy 2, 3, 5; F6.2 (see [requirements](../requirements.md))
