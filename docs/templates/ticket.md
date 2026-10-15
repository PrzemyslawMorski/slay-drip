# <KEY> · <Summary>

| Field | Value |
| --- | --- |
| **Key** | <KEY, e.g. S2-02 or F04; use the next free ID in the epic> |
| **Issue type** | Story \| Task \| Bug \| Spike \| Chore |
| **Priority** | Highest \| High \| Medium \| Low \| Lowest |
| **Status** | To Do \| In Progress \| In Review \| Done \| Blocked |
| **Epic** | <parent epic key and name, e.g. S2 · Capture and tagging> |
| **Components** | frontend \| backend \| infra \| ai \| docs |
| **Labels** | <free tags, e.g. gdpr, a11y, eval> |
| **Story points** | <1, 2, 3, 5, 8, 13; a Spike is time-boxed, not pointed> |
| **Sprint / Fix version** | <workshop session, e.g. Session 2> |
| **Reporter** | <role or name> |
| **Assignee** | <role or name, or Unassigned> |

## Description

**As a** <persona from [requirements](../requirements.md)>,
**I want** <capability>,
**so that** <outcome>.

Context and any detail needed to build it. Link the spec or ADR that governs the design
rather than restating it.

## Acceptance criteria

Each criterion is testable. Use Given / When / Then for behaviour, or a checkbox for a fact.

- [ ] Given <context>, when <action>, then <result>.
- [ ] ...

## Dependencies

List every link that changes when this ticket can start or finish. Use the key and status,
and say why it matters in one line.

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | <KEY> | <status> | <reason> |
| blocks | <KEY> | <status> | <reason> |
| relates to | <KEY> | <status> | <reason> |

If there are no blockers, write `None: can start now.`

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Open questions, risks, links to discovery notes or design files.
