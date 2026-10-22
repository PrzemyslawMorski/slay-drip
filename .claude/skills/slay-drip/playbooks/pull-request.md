# Playbook: open a pull request

Use at the end of every playbook that changes code. Open the PR as a draft from the task's worktree and branch.

1. **Check the standing gates.** Run the narrow tests for the area. Run `go test ./...` in `backend/` when the backend changed.
2. **Show the local run.** `CLAUDE.md` requires any feature that touches a cloud service to run against the local stack (`docs/local-development.md`). Put the command and its result in the PR description.
3. **Work through the security checklist** from `docs/security.md` when personal, body or special-category data is touched. Mark each item as done, or as not applicable with the reason.
4. **Link the requirement and the ticket.** Name the `docs/requirements.md` item and the `docs/specs/` ticket. If there is no ticket, say so and say why.
5. **Describe the change for the reader.** Say who it is for and what changes for them, then what the next maintainer will need to know. Do not paste the diff.
6. **Report what was not checked.** List any test you did not run, any step that was skipped, and any open decision that the change depends on.
7. **Keep the branch clean.** Commit with focused messages. Do not add unrelated files. Leave the worktree in place until the PR is merged, then clean it up as in `SKILL.md`.
