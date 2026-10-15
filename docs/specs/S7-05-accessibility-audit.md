# S7-05 · WCAG 2.1 AA audit

| Field | Value |
| --- | --- |
| **Key** | S7-05 |
| **Issue type** | Story |
| **Priority** | High |
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

Accessibility matters for the adaptive-needs audience.

**Scope**

- Automated axe checks on all pages in CI.
- Manual screen-reader pass (VoiceOver, TalkBack) on capture, review and recommendation flows.

## Acceptance criteria

- [ ] No AA violations in automated checks; manual findings resolved.

## Dependencies

None: can start now.

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: NFR: WCAG 2.1 AA (see [requirements](../requirements.md))
