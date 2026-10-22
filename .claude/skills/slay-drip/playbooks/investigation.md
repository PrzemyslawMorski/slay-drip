# Playbook: investigation

Use for a read-only question, or "are we sure?" about existing behaviour, code, docs or a decision. This playbook changes no files.

1. **State the question** in one sentence, and say what would answer it.
2. **Look in the source of truth first:** `CLAUDE.md`, then `docs/requirements.md`, `docs/security.md`, `docs/adr/` and `docs/specs/`. Then the code under `backend/` or `frontend/`.
3. **Check the claim against the code.** Quote the file and line for each fact. Mark anything you could not verify as unverified.
4. **Answer directly.** Give the answer first, then the evidence, then what is still open. If the answer is "we are not sure", say what would settle it.
5. **Do not write** a spec, ticket, ADR or code from an investigation. If the answer shows a change is needed, offer to start `playbooks/feature.md` or `playbooks/bugfix.md`.
