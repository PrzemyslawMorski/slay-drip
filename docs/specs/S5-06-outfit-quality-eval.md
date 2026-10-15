# S5-06 · Outfit quality eval with LLM judge and fairness check

| Field | Value |
| --- | --- |
| **Key** | S5-06 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 5 – Recommendation |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 5 – Recommendation |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

Not started.

**Scope**

- Rubric: coherence, occasion fit, colour harmony, rationale honesty.
- LLM judge plus a spot human-review sample.
- Constraint checker over all outputs.
- Scores broken down by body type and skin tone.

## Acceptance criteria

- [ ] Eval report shows comparable scores across persona groups, or a logged issue for each gap.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F08](F08-eval-harness-and-golden-set.md) | To Do | Eval harness and golden-set scaffold |
| is blocked by | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: AI quality: rubric + LLM judge, hard constraints, fairness (see [requirements](../requirements.md))
