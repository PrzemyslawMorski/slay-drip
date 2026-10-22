# Playbook: multi-phase or multi-PR plan

Use when the work spans several phases, several stacked PRs, or several workshop sessions. Plan it in a file first, then deliver one phase at a time.

1. **Anchor the goal.** Name the requirement in `docs/requirements.md` and the outcome that proves it is done.
2. **Split into phases.** Each phase is one PR or one ticket, and each ends in a check that can be run: a test, a local run, or a measured number. A phase with no check is not finished.
3. **Write the plan as a file.** Put it in `docs/specs/` using `_spec-template.md`, with one ticket per phase. Record the dependencies between phases in the ticket's Dependencies table.
4. **Mark the stop points.** Name the phases after which the user should review before the next one starts. Stop there and wait for the user.
5. **Deliver one phase.** Run the phase in its own worktree, then open its PR with `pull-request.md`. Start the next phase from `main` once the previous PR is merged, or say which branch it stacks on.
6. **Update the plan file** after each phase: what landed, what changed, and what the next phase now needs. The file is the handoff, not the chat.
