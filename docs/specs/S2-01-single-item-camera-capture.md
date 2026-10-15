# S2-01 · Single-item camera capture

| Field | Value |
| --- | --- |
| **Key** | S2-01 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 2 – Capture + tagging |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 2 – Capture + tagging |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

Upload accepts files only (drag-drop/file picker).

**Scope**

- Camera capture (`<input capture>` or `getUserMedia`) with framing guidance.
- Keep the existing client-side compression.
- Upload to Object Storage and create the item in an `untagged` state.

## Acceptance criteria

- [ ] A user can photograph one item on iOS and Android and see it in the wardrobe.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F03](F03-unify-item-model-and-wire-api.md) | To Do | Unify the item/outfit model and wire the frontend to the API |
| is blocked by | [F04](F04-image-storage-s3.md) | To Do | Image storage in Scaleway Object Storage with presigned uploads |
| is blocked by | [S1-01](S1-01-age-gate-and-consent.md) | To Do | 18+ gate and granular consent screens |
| blocks | [S2-02](S2-02-ai-auto-tagging.md) | To Do | AI auto-tagging with editable tags |
| blocks | [S2-03](S2-03-background-removal.md) | To Do | Background removal for flat-lay images |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F2.2 (see [requirements](../requirements.md))
