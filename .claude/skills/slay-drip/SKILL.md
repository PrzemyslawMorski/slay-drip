---
name: slay-drip
description: >-
  Master entry point for working in the Slay Drip (Outfit Planner) repo. Use this whenever a task touches this codebase: building a feature, changing the Go backend or the PWA frontend, a wardrobe, outfit, profile or occasion flow, a new requirement or decision, writing or reviewing a spec, ticket or ADR, a security or privacy review, anything touching body photos, measurements, wardrobe photos, location or accounts, a CI or deployment change, docs, or handing a session over. It routes to the right playbook or skill in order, so use it even when the request is only a short phrase like "add wardrobe upload", "new feature for outfits", "what should I do next for F4" or "wrap this up for tomorrow". Skip it for generic questions that do not involve this repo.
---

# Slay Drip master skill

This skill is a router. It classifies the request, picks one playbook, and loads the skills that playbook names. `CLAUDE.md` is the single source of truth for rules and conventions. Read the relevant part of it instead of relying on memory.

## Step 0: Orient

1. Read `CLAUDE.md` (sections "Where to look", "Working in this repo" and "Hard rules") when you have not read it in this session.
2. Run `git status` and `git worktree list`. If the task changes code, work in its own worktree (see the standing gates). Do not edit the main checkout unless the task is reading, review or release.

## Step 1: Route

Match the request to one row. Read the playbook named in that row, then load the skills in its "Load skills" column. Do not load a playbook that is not in the table.

| Request kind | Playbook | Load skills |
| --- | --- | --- |
| A new or changed feature, or any change to user data, auth, storage, AI or infrastructure | `playbooks/feature.md` | `spec-from-intent` when there is no spec yet, `tickets-from-spec` for splitting, `owasp-security-review` when personal, body or special-category data is touched |
| A bug fix or regression, with an error, a failing test or "this used to work" | `playbooks/bugfix.md` | none |
| A read-only question, or "are we sure?" about existing behaviour, code or docs | `playbooks/investigation.md` | none |
| Wrapping up, switching machines, or picking up tomorrow | none | `handoff` |
| A security, privacy or OWASP check on code, config, CI or a PR | none | `owasp-security-review` |
| A code review of a diff or PR | none | `docs/code-review/README.md` and the rule files it links |
| Running the app or its local stack | none | `docs/local-development.md` |
| A large or multi-PR change, or one that spans several sessions | `playbooks/multi-phase-plan.md` | `tickets-from-spec` |
| Anything not matching a row above | `playbooks/workflow.md` (fallback, "figure it out") | none |

Rules for routing:

- Pick the row by what the request asks for, not by how big the change looks. A small change to user data is still a feature.
- If two rows fit, use the one that protects more: a bug in personal data follows `feature.md` plus `owasp-security-review`.
- If no row fits, use the fallback. Do not guess a playbook.
- Say which row and playbook you picked, in one line, before you start.

## Step 2: Track and finish

1. Open a todo list whose first items are the playbook's steps, copied in as written, before any task-specific todos. A step you skip stays in the list with a one-line `skip: <reason>`.
2. End every playbook that changes code with `playbooks/pull-request.md`. Its checklist goes into the PR description, and a step that does not apply is marked "not applicable" with the reason.
3. Finish with a short reply: what changed, the evidence for each claim (measured, read in a file, or inferred), and what is still open.

## Autonomy

- **Just do it.** Reversible work proceeds without asking: reading, searching, editing files in your own worktree, running the narrow tests, running the local stack, and opening a draft PR.
- **Ask only for what only the user can know.** Secrets and `.env` values, the open decisions listed in `CLAUDE.md`, product or preference calls that no experiment can settle, and the requirement gate in step 1 of the feature playbook.
- **Always pause** before an irreversible or outward-facing action: force-pushing a shared branch, merging to `main`, deploys, deleting personal, body or measurement data, messages to users or vendors, and sending any data to an external service.
- **Settle facts by running them.** If a question is about behaviour you can observe (a test result, a response shape, a layout), run it instead of asking.
- **Say no when it is right.** If a request adds scope that does not earn its place, or an approach looks wrong, say so with the reason. Agreement is not the default.

## Triggers that route elsewhere

- Any request touching personal, body or special-category data → also load `owasp-security-review` and read `docs/security.md` first.
- A claim about speed, load or cost → measure it and show the number before you report it.
- A bug that comes back after a fix → stop and check the premise of the fix before writing another one.
- A new internal API or type while old callers exist → migrate the callers and delete the old API in the same change.

## Standing gates

These apply to every playbook.

- **Worktree per task.** Create it from `main` in `../slay-drip-worktrees/` as described under "Parallel work with git worktrees" in `CLAUDE.md`. Clean up with `git worktree remove` and `git worktree prune` when the branch is merged.
- **Backend tests.** Run `go test ./...` in `backend/` before opening a PR.
- **Secrets.** Never read, search, print, edit or create `.env` files. If a value is needed, ask the user for it.
- **Test data.** Use synthetic, freely licensed personas only. Never put real personal data in the repo.
- **Strings and accessibility.** UI copy goes through externalised strings, and the UI meets WCAG 2.1 AA.
- **Line endings.** Files are LF, and `.gitattributes` handles the rest. Do not set `core.autocrlf`.
- **Commits.** Prefer small commits with focused messages. Commit or push only when the user asks.

## Where things live

- Playbooks: `.claude/skills/slay-drip/playbooks/`
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
