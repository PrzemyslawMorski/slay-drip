# S2-02 · AI auto-tagging with editable tags

| Field | Value |
| --- | --- |
| **Key** | S2-02 |
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

All tags are entered by hand today.

**Scope**

- Async tagging job (upload event → Scaleway queue → serverless container worker) calling the chosen vision model with structured output: category, colours, pattern, material, formality, season, fit.
- Store tag source (`ai`/`user`) and confidence; UI shows tags as editable chips.
- User edits are never overwritten by re-tagging.

## Acceptance criteria

- [ ] Item gets tags in the background without blocking the UI.
- [ ] Every tag is editable and the edit persists.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S2-01](S2-01-single-item-camera-capture.md) | To Do | Single-item camera capture |
| is blocked by | [F10](F10-spike-eu-model-selection.md) | To Do | Spike: EU-hosted model selection |
| is blocked by | [F09](F09-ai-cost-tracking.md) | To Do | AI cost tracking per active user |
| blocks | [S2-04](S2-04-tagging-eval.md) | To Do | Tagging accuracy eval |
| blocks | [S3-01](S3-01-bulk-capture-segmentation.md) | To Do | Bulk rack/closet capture with AI segmentation |
| blocks | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F2.3; NFR: tagging runs in background (see [requirements](../requirements.md))
