# F08 · Eval harness and golden-set scaffold

| Field | Value |
| --- | --- |
| **Key** | F08 |
| **Issue type** | Task |
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

Requirements say evaluation is built alongside every slice. There is no eval code or dataset.

**Scope**

- Create `evals/` with a runner that can be invoked locally and in CI.
- Golden-set structure: synthetic personas (menswear/womenswear, petite/tall/plus, range of skin tones, modest and adaptive constraints) and hand-labelled items. Record licence for every image.
- Report format: per-attribute accuracy, constraint violations, rubric scores, broken down by persona attributes (for fairness).
- CI job that runs the cheap evals on every PR and the expensive ones on demand.

## Acceptance criteria

- [ ] `evals` runs end to end on a stub model and produces a report.
- [ ] Golden-set manifest includes licence/source per asset.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| blocks | [F10](F10-spike-eu-model-selection.md) | To Do | Spike: EU-hosted model selection |
| blocks | [S2-04](S2-04-tagging-eval.md) | To Do | Tagging accuracy eval |
| blocks | [S4-03](S4-03-tone-guardrails-and-tests.md) | To Do | Body-talk guardrails and tone tests |
| blocks | [S5-06](S5-06-outfit-quality-eval.md) | To Do | Outfit quality eval with LLM judge and fairness check |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: AI quality: golden set, per-attribute accuracy, hard constraints, LLM judge, tone, fairness (see [requirements](../requirements.md))
