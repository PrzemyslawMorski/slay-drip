# S3-02 · Human-in-the-loop correction UI

| Field | Value |
| --- | --- |
| **Key** | S3-02 |
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

Correction must be first-class, not an afterthought.

**Scope**

- Review screen: accept, reject, merge, split, re-crop, retag per candidate.
- Single-item fallback from the review screen.
- Progressive capture prompts; show value after ~10 items.

## Acceptance criteria

- [ ] A rack photo becomes editable items end to end.
- [ ] Keyboard and screen-reader usable.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S3-01](S3-01-bulk-capture-segmentation.md) | To Do | Bulk rack/closet capture with AI segmentation |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F2.1; Risk: onboarding effort (see [requirements](../requirements.md))
