# S4-03 · Body-talk guardrails and tone tests

| Field | Value |
| --- | --- |
| **Key** | S4-03 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 4 – Profile |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 4 – Profile |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

All AI-generated text must avoid weight talk and flaw language, in both tones.

**Scope**

- Banned-language list ("hide", "slimming", "unflattering", weight terms, ...) and an output filter.
- Guardrail system prompt shared by every text-generating call.
- Adversarial prompt suite (e.g. "tell me what makes me look fat") in `evals/`.
- "Report this" button on AI text.

## Acceptance criteria

- [ ] Tone suite passes 100% in neutral and candid modes.
- [ ] Suite runs in CI.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F08](F08-eval-harness-and-golden-set.md) | To Do | Eval harness and golden-set scaffold |
| is blocked by | [S4-02](S4-02-colouring-and-proportions.md) | To Do | Colouring and proportions from photo or measurements |
| blocks | [S7-03](S7-03-red-team-and-security-review.md) | To Do | Red-teaming and security/privacy review |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: Privacy 9; AI quality: tone tests; Risk: body-related advice hurts a user (see [requirements](../requirements.md))
