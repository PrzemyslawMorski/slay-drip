# <KEY> · <Summary>

| Field | Value |
| --- | --- |
| **Key** | <KEY, e.g. S2-02 or F04; use the next free ID in the epic> |
| **Issue type** | Story \| Task \| Bug \| Spike \| Chore |
| **Priority** | Highest \| High \| Medium \| Low \| Lowest (repo backlog: P0 = Highest, P1 = High, P2 = Medium) |
| **Status** | To Do \| In Progress \| In Review \| Done \| Blocked |
| **Epic** | <parent epic key and name, e.g. S2 · Capture and tagging> |
| **Components** | client \| server \| infra \| ai \| docs |
| **Labels** | <free tags, e.g. gdpr, a11y, eval> |
| **Story points** | <1, 2, 3, 5, 8, 13; a Spike is time-boxed, not pointed> |
| **Sprint / Fix version** | <workshop session, e.g. Session 2> |
| **Reporter** | <role or name> |
| **Assignee** | <role or name, or Unassigned> |

## User story

Write the story in Gherkin form. The persona must match a persona in [requirements](../requirements.md).

```gherkin
Feature: <capability name, as the ticket summary>
  As a <persona from requirements>
  I want <capability>
  So that <outcome>
```

Context and any detail needed to build it. Link the spec or ADR that governs the design
rather than restating it.

## Acceptance criteria

Every criterion is a Gherkin `Scenario` with `Given`, `When` and `Then` steps, written in a
`gherkin` code block. Each scenario is testable and maps to at least one automated test.
Use `And` or `But` to extend a step. Do not use checkboxes or free prose for criteria.

```gherkin
Scenario: <short name describing the behaviour>
  Given <precondition, in terms of the persona and the system state>
  When <single action the persona takes>
  Then <observable result>
  And <additional result, if needed>
```

Add one `Scenario` per distinct behaviour, including the error and edge cases the ticket
covers. Where several inputs produce the same behaviour, use `Scenario Outline` with an
`Examples` table.

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

- [ ] Code merged to `main` through a reviewed PR, with the repo's checks passing.
- [ ] Tests added or updated alongside the changed code.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or ticket status), if behaviour changed.

## Notes

Open questions, risks, links to discovery notes or design files.
