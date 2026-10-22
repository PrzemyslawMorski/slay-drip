# Playbook: bug fix

Use for a reported defect in existing behaviour: an error, a 500, a crash, a failing test, or behaviour that used to work. Use it even when the defect touches personal data, and load `owasp-security-review` alongside it.

1. **Reproduce.** Get the failure to happen on demand, locally, with the exact input or steps. Record the command or steps in the PR.
2. **Find the requirement.** Check the behaviour against `docs/requirements.md`. If the bug is really a missing requirement, switch to `playbooks/feature.md`.
3. **Test first.** Add a failing test that captures the bug, in the same area as the code (backend `go test ./...`, frontend Playwright per ADR-0003).
4. **Fix the smallest cause.** Change only what the failing test needs. Keep the diff in the area of the bug.
5. **Check the guardrails.** If the bug touches personal, body or special-category data, read `docs/security.md` and run the PR checklist. A fix must not weaken a hard rule in `CLAUDE.md`.
6. **Verify.** Run the narrow tests for the area, then `go test ./...` in `backend/` before the PR. Run the fixed path on the local stack when a cloud service is involved.
