# F10 · Spike: EU-hosted model selection

| Field | Value |
| --- | --- |
| **Key** | F10 |
| **Issue type** | Spike |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Foundation (before Session 2) |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Foundation (before Session 2) |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

No AI provider is integrated. Vision, segmentation and text models must run in the EU under a DPA with zero retention and no training.

**Scope**

- Shortlist EU-region options (Scaleway-hosted models in `fr-par` first; then self-hosted; EU-hosted third-party APIs as fallback).
- Run tagging and segmentation on a small golden subset; compare accuracy, latency, cost.
- Confirm DPA, data residency and retention terms per vendor.
- Write an ADR in `docs/adr/`.

## Acceptance criteria

- [ ] ADR merged with chosen model(s) per task (tagging, segmentation, background removal, recommendation, judge).
- [ ] Measured numbers attached.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F08](F08-eval-harness-and-golden-set.md) | To Do | Eval harness and golden-set scaffold |
| blocks | [S2-02](S2-02-ai-auto-tagging.md) | To Do | AI auto-tagging with editable tags |
| blocks | [S2-03](S2-03-background-removal.md) | To Do | Background removal for flat-lay images |
| blocks | [S3-01](S3-01-bulk-capture-segmentation.md) | To Do | Bulk rack/closet capture with AI segmentation |
| blocks | [S4-02](S4-02-colouring-and-proportions.md) | To Do | Colouring and proportions from photo or measurements |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: Open question: which EU-hosted model(s) meet the vision quality bar; Privacy 2 (see [requirements](../requirements.md))
