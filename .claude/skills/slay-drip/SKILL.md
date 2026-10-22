---
name: slay-drip
description: >-
  Master entry point for working in the Slay Drip (Outfit Planner) repo. Use this whenever a task touches this codebase: building a feature, changing the Go backend or the PWA frontend, a wardrobe, outfit, profile or occasion flow, a new requirement or decision, writing or reviewing a spec, ticket or ADR, a security or privacy review, anything touching body photos, measurements, wardrobe photos, location or accounts, a CI or deployment change, docs, or handing a session over. It routes to the right doc or skill in order, so use it even when the request is only a short phrase like "add wardrobe upload", "new feature for outfits", "what should I do next for F4" or "wrap this up for tomorrow". Skip it for generic questions that do not involve this repo.
---

# Slay Drip master skill

This skill is a router. `CLAUDE.md` is the single source of truth for rules and conventions, so read the relevant part of it instead of relying on memory. This skill tells you which doc or skill to open next and in what order.

## Step 0: Orient

1. Read `CLAUDE.md` (sections "Where to look", "Working in this repo" and "Hard rules") when you have not read it in this session.
2. Check the branch and worktree with `git status` and `git worktree list`. If the task changes code, work in its own worktree (see the gates below). Do not edit the main checkout unless the task is reading, review or release.

## Step 1: Pick the path

| The request is about | Go to |
| --- | --- |
| A new feature or a change to user data, auth, storage, AI or infrastructure | The feature flow below |
| A feature or requirement that has no spec yet | `spec-from-intent` skill |
| Splitting an existing spec into work | `tickets-from-spec` skill |
| A security, privacy or OWASP check on code, config or a PR | `owasp-security-review` skill |
| Wrapping up, switching machines, or picking up tomorrow | `handoff` skill |
| A code review of a diff or PR | `docs/code-review/README.md` (the rule files it links) |
| Running the app or its local stack | `docs/local-development.md` |
| A fix or change that is clearly small and in one area | Read the area's code and its tests, then make the change |

## Feature flow (the seven steps from CLAUDE.md)

Do not skip a step because the change looks small. If a step does not apply, say so in the PR.

1. **Requirement.** Find the matching item in `docs/requirements.md` (F1 to F6, GDPR, quality bar, workshop plan). If none exists, stop and ask whether to add one.
2. **Ticket.** Find or create it in `docs/specs/` from `_ticket-template.md`. Check each blocker's status in the Dependencies table.
3. **Discovery.** If the approach depends on an open question (vendor, model, region, cost), write `docs/discovery/YYYY-MM-DD-<topic>.md` before choosing. Open decisions are listed in `CLAUDE.md`. Do not decide them yourself.
4. **Spec.** For anything larger than one ticket, use `spec-from-intent` or copy `docs/specs/_spec-template.md`. Keep the ticket and spec in step.
5. **ADR.** Anything hard to reverse (vendor, data store, auth model, a new region or dependency with data access) gets `docs/adr/NNNN-<slug>.md` from `docs/adr/_template.md`. Never renumber. Supersede instead.
6. **Security.** Read `docs/security.md` before touching personal, body or special-category data. Use its PR checklist in the PR description.
7. **Implement.** Write tests alongside the code and run the feature against the local stack (`docs/local-development.md`). The PR shows the local run.

## Standing gates

- **Worktree per task.** Create it from `main` in `../slay-drip-worktrees/` as described under "Parallel work with git worktrees" in `CLAUDE.md`. Clean up with `git worktree remove` and `git worktree prune` when the branch is merged.
- **Backend tests.** Run `go test ./...` in `backend/` before opening a PR.
- **Secrets.** Never read, search, print, edit or create `.env` files. If a value is needed, ask the user for it.
- **Test data.** Use synthetic, freely licensed personas only. Never put real personal data in the repo.
- **Strings and accessibility.** UI copy goes through externalised strings, and the UI meets WCAG 2.1 AA.
- **Line endings.** Files are LF, and `.gitattributes` handles the rest. Do not set `core.autocrlf`.
- **Commits.** Prefer small commits with focused messages. Commit or push only when the user asks.

## Where things live

- Requirements and workshop plan: `docs/requirements.md`
- Security and privacy rules: `docs/security.md`
- Local run and stand-ins: `docs/local-development.md`, `compose.yaml`
- Specs and tickets: `docs/specs/`
- Decisions: `docs/adr/`
- Research before a decision: `docs/discovery/`
- Review rules by area: `docs/code-review/`
- Backend (Go, module `slaydrip/backend`): `backend/cmd/api`, `backend/internal/`, `backend/migrations/`
- Frontend (PWA): `frontend/`
- Docs folder conventions: `docs/README.md`
