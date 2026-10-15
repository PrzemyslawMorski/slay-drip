# S2-03 · Background removal for flat-lay images

| Field | Value |
| --- | --- |
| **Key** | S2-03 |
| **Issue type** | Story |
| **Priority** | High |
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

No image processing beyond compression.

**Scope**

- Produce a transparent cut-out derivative per item (EU-hosted model or library).
- Store as a second Object Storage object; fall back to the original on failure.

## Acceptance criteria

- [ ] Cut-outs exist for golden items; failures fall back gracefully.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S2-01](S2-01-single-item-camera-capture.md) | To Do | Single-item camera capture |
| is blocked by | [F10](F10-spike-eu-model-selection.md) | To Do | Spike: EU-hosted model selection |
| blocks | [S5-04](S5-04-flat-lay-collage.md) | To Do | Flat-lay collage rendering |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F2.5 (see [requirements](../requirements.md))
