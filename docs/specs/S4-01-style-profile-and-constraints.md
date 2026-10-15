# S4-01 · Style preferences, hard constraints and tone setting

| Field | Value |
| --- | --- |
| **Key** | S4-01 |
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

No profile exists.

**Scope**

- Profile: menswear / womenswear / both (no inference from gender), fit preferences, never-wear colours and items.
- Hard constraints: modest/cultural coverage rules, adaptive needs (no buttons, seated-friendly, ...). Stored as special-category data behind explicit consent.
- Tone setting: neutral (default) or candid.

## Acceptance criteria

- [ ] Profile can be created, edited and deleted.
- [ ] Constraint fields cannot be saved without explicit consent.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S1-01](S1-01-age-gate-and-consent.md) | To Do | 18+ gate and granular consent screens |
| blocks | [S4-02](S4-02-colouring-and-proportions.md) | To Do | Colouring and proportions from photo or measurements |
| blocks | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F1.4; F1.5; F1.6; GDPR Art. 9 note (see [requirements](../requirements.md))
