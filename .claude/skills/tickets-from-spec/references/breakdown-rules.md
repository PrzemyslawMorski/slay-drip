# Breakdown rules

How to split a spec into tickets that one small agent can finish without asking anyone. The limits below are hard. `scripts/check_tickets.py` enforces the ones it can check.

## Keys and files

- Children of a spec take the spec's ID plus a two-digit sequence: spec `S1-02` gives `S1-02.01`, `S1-02.02`, and so on. The sequence follows the dependency order, so the first ticket to run has the lowest number.
- File name: `docs/specs/<KEY>-<slug>.md`, for example `docs/specs/S1-02.03-save-outfit-with-name.md`. The slug is lowercase kebab-case from the summary.
- Never reuse a key. If a ticket is dropped, mark it `Done` with a note, or leave the number unused and say so in the spec.
- The `Key` field and the file name must match. The checker rejects a mismatch.

## Size limits (hard)

| Limit | Value | Why |
| --- | --- | --- |
| Gherkin scenarios per ticket | 1 to 3 | One agent can hold a few behaviours in context. |
| Roles per ticket | exactly 1 | One owner, one checklist. |
| Files to change | 1 to 5 bullets | A wider diff means the ticket is two tickets. |
| Story points | 1, 2 or 3 (a Spike is not pointed) | Five or more is a split, not a size. |
| Layers per ticket | 1 | Data, API, UI and AI are separate tickets. |

If a ticket needs a 4th scenario, split it by behaviour. If a ticket needs files from two roles, split it by role.

## Where to cut

Work through the spec in this order. Each step can produce several tickets.

1. **Blocking decisions.** Every ADR in the spec's Dependencies that is `Proposed`, and every open decision the spec touches. These are not tickets. Record them as blocked-by rows with the ADR's status, and tell the user they must be accepted. Only a Spike ticket is created when the answer needs research: an `architect` ticket that writes a discovery note.
2. **Infrastructure stand-ins.** Each new local service, bucket, table or config key the spec needs: one `infra-engineer` ticket. The config keys must be the same as production.
3. **Acceptance tests, red.** Group the spec's scenarios by their `Feature` and by behaviour. One `acceptance-author` ticket per group of 1 to 3 scenarios. These go first, because everything else turns them green.
4. **Hard-rule tests.** One `acceptance-author` or `backend-engineer` ticket per hard rule the spec touches: age gate, consent gate, revocation deletes, EU region, banned language, hard constraint filter, honest output. Label each `hard-rule`. These are never merged into a feature ticket (TDD-05).
5. **Storage and data.** `data-engineer` tickets for the store or migration each scenario group needs.
6. **Server logic.** `backend-engineer` tickets per route or domain rule. Each route is one ticket per behaviour, not one per route.
7. **AI.** `ai-engineer` tickets for each model call, prompt or parser. `eval-engineer` tickets for golden items and per-attribute metrics, one per attribute group.
8. **Client UI.** `frontend-engineer` tickets per screen state (empty, error, success), and one for strings if the spec adds more than five new strings.
9. **Pure logic.** Any validation, sniffing, ranking or EXIF helper becomes its own `frontend-engineer` or `backend-engineer` ticket with unit tests. It is `Task`, not `Story`, and its scenarios are unit-level, so they are not in the spec.
10. **Reviews.** One `privacy-reviewer` ticket per spec, blocked by every implementation ticket. One `a11y-reviewer` ticket when the spec adds a screen. Both are read-only.
11. **Docs.** One `docs-steward` ticket last, to update the spec status, any ADR amendment the spec needs (for example a new store), and the requirement text if the user approved it.

## Ordering and dependencies

- Acceptance tests come before the code they cover. Every implementation ticket for a scenario is blocked by that scenario's `acceptance-author` ticket.
- Data before API before UI: a `frontend-engineer` ticket that calls an endpoint is blocked by the `backend-engineer` ticket that creates it.
- A review ticket is blocked by every implementation and hard-rule ticket in the spec.
- The docs ticket is blocked by the reviews.
- Dependencies are written on both sides. If ticket A says `is blocked by` B, ticket B must say `blocks` A. The checker enforces this.
- A ticket blocked by a `Proposed` ADR or an open decision gets `Status: Blocked`. Everything else is `To Do`.

## Waves

After the dependency table is complete, group the tickets into waves: wave 1 has no open blockers, wave 2 is blocked only by wave 1, and so on. Tickets in one wave can run in parallel, each in its own worktree (CLAUDE.md). Put the waves in the spec's Tickets section, so whoever dispatches the agents can see what runs together.

## Coverage

- Every Gherkin scenario in the spec appears in exactly one `acceptance-author` ticket, with its exact title.
- An implementation ticket names, in Notes, the scenario titles it turns green. A scenario may be listed by more than one implementation ticket, but never by zero.
- A scenario that the spec states but no ticket covers is a breakdown error. Do not drop it quietly.
- A criterion written as a checkbox in the spec (not yet Gherkin) is converted to a scenario in the acceptance-author ticket. If it cannot be written as observable Given/When/Then, ask the user to reword it in the spec before breaking the spec down.

## Story points

Use 1 for one scenario on existing code, 2 for one scenario with new code, and 3 for a scenario with new code and a new module. Anything larger is split. A Spike has no points: write `N/A: time-boxed spike, <n> day(s)` in the field.

## Priority

Copy the spec's priority: P0 becomes `Highest`, P1 `High`, P2 `Medium`. Keep the repo-backlog note in the template's text.

## Labels

Each ticket carries:

- `role:<role-id>` (exactly one, from `roles.md`)
- `spec:<SPEC-ID>` (for example `spec:S1-02`)
- `hard-rule` when the ticket enforces a hard rule
- Any spec label that applies to this ticket only: `gdpr`, `a11y`, `security`, `eval`, `frontend-only`

## Things that stop the breakdown

Ask the user (AskUserQuestion) or stop, do not guess:

- The spec has no requirement, or its requirement says "none yet" (CLAUDE.md, starting a feature).
- A scenario needs a decision in the open-decisions list.
- A scenario cannot be expressed as observable Given/When/Then.
- The spec's Slice or Epic name is missing, so the Epic field cannot be filled.
