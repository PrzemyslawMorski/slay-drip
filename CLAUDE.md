# CLAUDE.md

Single source of truth for agent and human guidance in this repo. `AGENTS.md` points here; do not duplicate content elsewhere. Keep this file focused; product detail lives in the linked docs.

## What this project is

**Slay Drip (working name: Outfit Planner)** is a mobile-first PWA that turns a person's own wardrobe into flat-lay outfits for a chosen occasion in under 2 minutes, matched to their colouring, body shape and taste.

- Launch market: EU, English UI first. Menswear and womenswear from v1.
- Primary persona: the considered dresser (18+) who wants speed, variety and fresh combinations from what they already own.
- It must be a viable product for real EU users, not a demo. It is also the backbone of an 8-session AI Champions workshop; each session ships one vertical slice end to end.
- MVP loop: capture wardrobe → build profile → ask for an occasion → get outfits → react / wear → better next time.
- **v1 goal:** deliver the full MVP loop end to end for EU users, meeting the quality bar below (first outfits in ≤ 10 s at p95, per-attribute tagging accuracy, fairness parity across body types and skin tones). Each workshop session ships one working vertical slice toward it. Scope and milestones: `docs/requirements.md`.

## Where to look

Read these on demand rather than up front:

- `docs/requirements.md`: product scope, functional requirements (F1–F6), GDPR requirements, AI quality bar, workshop plan, open questions. Source of truth for *what* to build.
- `docs/README.md`: how the docs folders work and which template to start from.
- `docs/agent-guardrails.md`: what the agent hooks block and how to run git and PR commands within them. Read before the first shell or git command.
- `docs/security.md`: security and privacy guidelines (18+, GDPR, EU-only, secrets, logging). Read before touching user data, auth, storage or AI.
- `docs/specs/`: per-task specs and tickets (none written yet). Templates: `_spec-template.md`, `_ticket-template.md`.
- `docs/adr/`: architecture decision records (none accepted yet). Template: `_template.md`.
- `docs/discovery/`: research before a decision (none yet). Template: `_template.md`.

## Platform decisions

- **Cloud provider: Scaleway, not AWS.** All hosting, storage, databases, container registries, CI credentials and AI inference run on Scaleway in EU regions (`fr-par` by default). Do not add AWS resources, SDKs, CLIs or config.
- The application stack is not chosen yet. Record each stack decision as an ADR in `docs/adr/` before code depends on it.

## Layout

- `docs/`: requirements, security guide, specs (`specs/`), ADRs (`adr/`) and discovery notes (`discovery/`). Each folder holds its `_`-prefixed template. See `docs/README.md`.
- `.claude/`: project settings and the `.env` guard hook.
- `compose.yaml`, `infra/dev/`, `scripts/dev/`: local stand-ins for Scaleway services (PostgreSQL, S3) and their smoke checks. See `docs/local-development.md` and ADR-0005.
- `backend/`: Go API (module `slaydrip/backend`). `cmd/api` is the entry point, `internal/` holds the packages, `migrations/` the SQL migrations, `.golangci.yml` the lint config. Stack in ADR-0007 and ADR-0008.

Backend commands are in `docs/local-development.md`. Run `go test ./...` in `backend/` before a PR. The frontend is in `frontend/`, and its Playwright tests are in ADR-0003.

## Working in this repo

- **Local run is first class.** Any feature that touches a cloud service must run against the local stack (`docs/local-development.md`) before it ships, using the same config keys as production. Its PR shows the local run.
- Run the narrowest relevant tests after touching an area. Do not leave dev servers running in automated sessions.
- **Strings**: all UI copy goes through externalised strings, ready for later localisation.
- **Secrets**: never hardcode secrets. Prefer existing templates over new config mechanisms.
- **Git**: prefer incremental commits with focused messages.
- **Line endings**: files are stored with LF. `.gitattributes` (`* text=auto eol=lf`) normalises them, so Windows checkouts that show CRLF in the working tree are expected and should not appear as modified. Do not set `core.autocrlf` in the repo; rely on `.gitattributes`. Binary assets are marked `binary` there.

## Parallel work with git worktrees

Use git worktrees extensively so parallel work never shares a checkout. This applies to humans and agents alike.

- **Default to a worktree** for any task that changes code, and always when more than one task, agent or session is running at once. Keep the main checkout at `main` for reading, review and release steps.
- **One worktree per task, one agent per worktree.** Never point two agents or sessions at the same worktree or branch.
- **Create from `main`:** `git worktree add ../slay-drip-worktrees/<branch-slug> -b <type>/<branch-slug> main`. Worktrees live outside the repo, in `../slay-drip-worktrees/`, never nested inside it. Uncommitted changes in another checkout do not carry over, so branch from the committed `main`.
- **Untracked files are not copied.** `.env` files and other local config are absent in a new worktree. Ask the user for the values; never copy them from another checkout by hand.
- **Dependencies and local services are per worktree.** Install dependencies inside each worktree. Do not share `node_modules` or build output. Local stack ports from `compose.yaml` clash across worktrees, so stop the stack in one before starting it in another, or give it its own compose project name.
- **Keep the scope in the worktree.** Commit on its branch, open the PR from it, and leave other worktrees alone.
- **Clean up** once the branch is merged or abandoned: `git worktree remove <path>`, then `git worktree prune`. Do not leave dev servers running in a worktree when the task ends.

## When making changes

- Keep changes scoped to the requested task.

## Workshop takeaways (end of day)

`docs/workshop-takeaways.md` records what was done each workshop day, with a short takeaway per day. It is updated at the end of the workshop day.

- **When to update:** if the local time is 14:00 or later, treat the workshop day as closing and update the file before finishing. Check the time with `Get-Date` (PowerShell) or `date` (Bash), not by guessing.
- **What to write:** add or update the entry for today's date, with a short summary and a one-line takeaway. Base it on the day's commits and merged PRs (`git log --since=midnight`) and on the work finished in the session.
- **Keep it short:** one dated entry per day, grouped under its week. Do not repeat the same entry, and do not add content the repo already records elsewhere (link to it instead).
- **Before 14:00:** do not update the file unless the user asks.

## Starting a feature or decision

Follow this order before writing code for a new feature, or for any change that touches user data, auth, storage, AI or infrastructure. Templates are the `_`-prefixed files in each docs folder; the index is `docs/README.md`.

1. **Check the requirement.** Find the matching item in `docs/requirements.md`. If none exists, stop and ask whether to add one.
2. **Check the backlog.** Find or create the ticket in `docs/specs/` from `_ticket-template.md`. Set its Dependencies table from the `depends_on` list and check each blocker's status.
3. **Discovery first when unsure.** If the approach depends on an unanswered question (vendor, model, region, cost), write `docs/discovery/YYYY-MM-DD-<topic>.md` from `_template.md` before choosing.
4. **Write the spec.** Copy `_spec-template.md` into `docs/specs/<TASK-ID>-<slug>.md` for any feature larger than one ticket. Keep the ticket and the spec in step.
5. **Record significant decisions as ADRs.** Anything hard to reverse (vendor, data store, auth model, a new region or dependency with data access) gets `docs/adr/NNNN-<slug>.md` from `_template.md`. Never renumber; supersede instead.
6. **Apply the security guide.** Read `docs/security.md` before touching personal, body or special-category data. Use its PR checklist in the PR description.
7. **Only then implement,** with tests alongside the code, and runnable locally against the stand-ins (`docs/local-development.md`).

Do not skip a step because the change looks small. If a step does not apply, say so in the PR. Do not duplicate the templates' content into code comments or other files.

## Hard rules (non-negotiable)

These come from `docs/requirements.md` and apply to every change, including tests, prompts and sample data.

- **18+ only**, enforced at sign-up. Users under 18 are out of scope.
- **Granular, revocable consent** per data type (body photo, measurements, wardrobe photos, weather/location). Revoking consent deletes that data.
- **EU-only processing**: all storage and AI inference in EU regions, with vendors under a zero-retention, no-training DPA. Scaleway regions only: `fr-par`, `nl-ams` or `pl-waw`.
- **No identification**: no face recognition, no matching users across accounts. Body photos are never used to identify anyone.
- **Special-category data**: modesty and adaptive-needs fields may be GDPR Art. 9 data. Assume explicit consent is required for these fields; DPO/legal review is still open.
- **Body-talk guardrails**: never mention weight, and never use flaw language ("hide", "slimming", "unflattering"), even in candid mode. Candid mode may be frank about fit and proportion, never about a body's worth.
- **Hard constraints are hard filters**: availability, weather, modesty and adaptive constraints must hold 100% of the time and are checked automatically. Never trade them off for ranking quality.
- **Honest outputs**: if the wardrobe cannot satisfy a request, say so and offer a gap suggestion. Do not return a weak outfit to fill the slot.
- **Transparency**: each recommendation states which signals it used.
- **Accessibility**: UI meets WCAG 2.1 AA.
- **Test data**: workshop sessions use only synthetic, freely licensed personas. Never introduce real personal data into the repo.
- **Secrets**: agents must never read, search, print, edit or create `.env` files (`.env`, `.env.*`, `*.env`, `.envrc`). Blocked by `permissions.deny` and a PreToolUse hook in the project's `.claude/settings.json`. Ask the user for values instead; do not work around the block through Bash.
- **Scripts are Python**: repo scripts (dev tooling, smoke checks, hooks, CI helpers) are written in Python using the standard library. Do not add PowerShell (`.ps1`) or bash (`.sh`) scripts to the repo. Docs may show a one-line command that runs a Python script, but not a shell script.

## Quality bar for AI features

- Tagging accuracy is measured per attribute against hand-labelled items.
- Outfit generation returns first results in ≤ 10 s at p95; tagging runs in the background.
- Outfit quality is scored by a rubric (coherence, occasion fit, colour harmony, rationale honesty) with an LLM judge plus spot human review.
- Fairness: comparable quality scores across body types and skin tones in the golden set.
- Track AI cost per active user per month from day one.

## Open decisions

Do not decide these yourself; flag them if a task depends on them: product owner and IP, pilot user group, EU-hosted model choice (spike before session 2), DPO review of special-category fields, product name, identity provider for user accounts (F02; Scaleway has no managed user directory, so this needs a choice such as self-hosted Keycloak or an EU-hosted SaaS), application stack.
