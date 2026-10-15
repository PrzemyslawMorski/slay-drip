# S7-03 · Red-teaming and security/privacy review

| Field | Value |
| --- | --- |
| **Key** | S7-03 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 7 – Trust hardening |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 7 – Trust hardening |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

Not started.

**Scope**

- Adversarial testing of prompts (body-shaming, constraint bypass, prompt injection via free text and item names).
- IAM, bucket policy and authorizer review; dependency audit.
- Track findings as tasks and close them.

## Acceptance criteria

- [ ] All red-team findings closed or accepted with a reason.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S4-03](S4-03-tone-guardrails-and-tests.md) | To Do | Body-talk guardrails and tone tests |
| is blocked by | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: Workshop #7; Privacy 7, 9 (see [requirements](../requirements.md))
