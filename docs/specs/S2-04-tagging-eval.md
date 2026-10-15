# S2-04 · Tagging accuracy eval

| Field | Value |
| --- | --- |
| **Key** | S2-04 |
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

Session 2 is done when golden items are tagged with measured accuracy.

**Scope**

- Hand-label the golden items for all tag attributes.
- Eval computes per-attribute accuracy and a confusion summary, split by menswear/womenswear.

## Acceptance criteria

- [ ] Report with per-attribute accuracy checked into `evals/reports/` (or CI artifact).

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F08](F08-eval-harness-and-golden-set.md) | To Do | Eval harness and golden-set scaffold |
| is blocked by | [S2-02](S2-02-ai-auto-tagging.md) | To Do | AI auto-tagging with editable tags |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: AI quality: per-attribute accuracy; Workshop #2 done-when (see [requirements](../requirements.md))
