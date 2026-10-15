# S3-01 · Bulk rack/closet capture with AI segmentation

| Field | Value |
| --- | --- |
| **Key** | S3-01 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 3 – Bulk capture |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 3 – Bulk capture |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

Not started.

**Scope**

- Capture guidance screen (lighting, spacing, expectations).
- Segmentation job splits one photo into item crops, each fed into tagging.
- Low-confidence crops flagged for review.

## Acceptance criteria

- [ ] A rack photo from the golden set becomes N candidate items.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S2-02](S2-02-ai-auto-tagging.md) | To Do | AI auto-tagging with editable tags |
| is blocked by | [F10](F10-spike-eu-model-selection.md) | To Do | Spike: EU-hosted model selection |
| blocks | [S3-02](S3-02-correction-ui.md) | To Do | Human-in-the-loop correction UI |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F2.1; Risk: segmentation unreliable (see [requirements](../requirements.md))
