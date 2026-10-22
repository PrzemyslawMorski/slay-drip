# Filling the ticket template

Copy `docs/specs/_ticket-template.md` for every ticket and fill it in. Keep every heading in the template, in the same order. The only addition is the **Agent brief** block at the top of the Notes section. The brief is what a small agent reads first, so it must make the ticket runnable without the rest of the spec.

## Header table

| Field | How to fill it |
| --- | --- |
| Key | `<SPEC-ID>.<nn>`, for example `S1-02.03`. Matches the file name. |
| Issue type | `Story` for a behaviour a persona sees. `Task` for tests, infra, data, docs, reviews and pure logic. `Spike` for research with a time box. Never `Bug` at breakdown time. |
| Priority | The spec's priority, mapped as in `breakdown-rules.md`. |
| Status | `To Do`, or `Blocked` when a blocker is a `Proposed` ADR or an open decision. |
| Epic | The spec's epic, for example `S1 · Walking skeleton`. The spec's Slice line gives the session. Ask if it has no name. |
| Components | `client` for UI, on-device storage and photo logic. `server` for backend and data. `ai` for model and eval work. `infra` for stand-ins and CI. `docs` for ADRs, specs and reviews. Use one or two. |
| Labels | `role:<id>`, `spec:<SPEC-ID>`, then `hard-rule` or spec labels that apply to this ticket. |
| Story points | 1, 2 or 3, or `N/A: time-boxed spike, <n> day(s)`. |
| Sprint / Fix version | `Session <n>`, from the spec's Slice line. |
| Reporter | Przemysław Morski, the user who asked for the breakdown. |
| Assignee | `Unassigned`. The role label decides who takes it. |

## User story

Write one `Feature` block in Gherkin.

- `As a` must match a persona in `docs/requirements.md`. For an enabling ticket (a test, an infra stand-in, a review), use the persona whose behaviour it enables, and make the `So that` line say what it enables, for example `So that the S1-02 scenarios can run against the stand-ins`.
- `Feature:` is the capability in a few words, not the ticket summary repeated.

Under the block, write two or three sentences of context. Link the spec and any ADR that governs the design. Do not restate either.

## Acceptance criteria

One `gherkin` code block with one `Scenario` per distinct behaviour. Keep the titles exactly as they are in the spec, so the checker can match them. Do not use checkboxes here: the template forbids them.

- `acceptance-author` tickets copy the scenarios from the spec, verbatim.
- Implementation tickets copy the scenarios they turn green. Where the behaviour is unit-level (a helper, a parser), write a new scenario with a title that says what it proves, and say in Notes that it is unit-level.
- Never write a scenario that the spec does not support. If you need one, say so in the spec's Risks table rather than inventing it.

## Dependencies

Use the three relationship rows from the template. Each row is `| <relationship> | <KEY or ADR-NNNN> | <status> | <one-line reason> |`.

- Sibling tickets in the same spec use their key and their status from the file.
- ADRs use `ADR-NNNN (short name)` and the status from the ADR file.
- Requirements and specs in other slices use their key.
- If none apply, write `None: can start now.` in the body and leave the table out.

## Definition of done

Keep all five checkboxes. Tick none of them. Remove a line only if it does not apply, and say why in Notes. Examples of when a line does not apply: a review ticket has no code to merge, so the first line stays but the test line says `N/A: read-only review`.

## Notes: the agent brief

Put this block first in Notes, using these bold labels in this order. Each item is one line, or a short bullet list where marked.

```markdown
**Agent brief**

- **Role:** `<role-id>` (see `.claude/skills/tickets-from-spec/references/roles.md`)
- **Goal:** one sentence stating the behaviour or artefact this ticket delivers.
- **Read first:** the spec section and the docs named in the role's "Reads first" that apply to this ticket, as relative links.
- **Files to change:**
  - `<path>`, what changes in it
  - `<path>`, what changes in it
- **Do not touch:** anything outside the role's owned paths, and the specific files a neighbouring ticket is changing.
- **Covers scenarios:** the exact titles of the scenarios this ticket makes pass, each in backticks and separated by semicolons, for example `` `Scenario title one`; `Scenario title two` `` (none for read-only tickets).
- **Done when:** the scenarios pass, and the role's checks pass: list the exact commands from the role or ruleset.
- **Out of scope:** the neighbouring behaviour that belongs to another ticket, by key.
- **Open questions:** `None.`, or the question for a human, which stops the ticket.
```

Then the existing Notes content from the template (open questions, risks, links), if any. Keep it short.

Rules for the brief:

- Every path in **Files to change** must start with a path the role owns. The checker enforces this. For a review role, write `None (read-only)`.
- Keep **Files to change** to five bullets or fewer. More means the ticket should be split.
- **Done when** names real commands from `docs/code-review/` or `docs/local-development.md`, for example `npm run test:acceptance` in `frontend/`, or `go test ./...` in `backend/`. Do not invent a command.
- **Out of scope** names the neighbouring tickets, so an agent that finds the next step does not take it.
- If the ticket touches personal, body or special-category data, the brief names the consent rule and the hard-rule test that covers it (`docs/code-review/consent-and-gdpr.md`).

## What not to put in a ticket

- Code, or a design of internal classes. Leave implementation detail to the agent and the PR.
- Real names, photos, measurements, weights or body-talk language. Synthetic personas only.
- Any value that belongs in `.env`, a secret or a token. Name the config key and say the value comes from the team's secret store.
- Decisions the open-decisions list reserves for the user.
