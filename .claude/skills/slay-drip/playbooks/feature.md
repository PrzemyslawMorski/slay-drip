# Playbook: feature

Use for new or changed behaviour, and for any change to user data, auth, storage, AI or infrastructure. Do not skip a step because the change looks small. If a step does not apply, say so in the PR.

1. **Requirement.** Find the matching item in `docs/requirements.md` (F1 to F6, GDPR, quality bar, workshop plan). If none exists, stop and ask whether to add one.
2. **Ticket.** Find or create it in `docs/specs/` from `_ticket-template.md`. Check each blocker's status in the Dependencies table.
3. **Discovery.** If the approach depends on an open question (vendor, model, region, cost), write `docs/discovery/YYYY-MM-DD-<topic>.md` from `_template.md` before choosing. Open decisions are listed in `CLAUDE.md`. Do not decide them yourself.
4. **Spec.** For anything larger than one ticket, use `spec-from-intent` or copy `docs/specs/_spec-template.md`. Keep the ticket and spec in step.
5. **ADR.** Anything hard to reverse (vendor, data store, auth model, a new region or dependency with data access) gets `docs/adr/NNNN-<slug>.md` from `docs/adr/_template.md`. Never renumber. Supersede instead.
6. **Security.** Read `docs/security.md` before touching personal, body or special-category data. Use its PR checklist in the PR description.
7. **Implement.** Write tests alongside the code and run the feature against the local stack (`docs/local-development.md`). The PR shows the local run.

The handoff between steps is the file: requirement → ticket → spec → ADR → code. A later step starts from the file, not from chat.
