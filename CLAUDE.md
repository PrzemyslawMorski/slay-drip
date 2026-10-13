# CLAUDE.md

Single source of truth for agent and human guidance in this repo. `AGENTS.md` points here; do not duplicate content elsewhere. Keep this file focused; product detail lives in the linked docs.

## What this project is

**Slay Drip (working name: Outfit Planner)** is a mobile-first PWA that turns a person's own wardrobe into flat-lay outfits for a chosen occasion in under 2 minutes, matched to their colouring, body shape and taste.

- Launch market: EU, English UI first. Menswear and womenswear from v1.
- Primary persona: the considered dresser (18+) who wants speed, variety and fresh combinations from what they already own.
- It must be a viable product for real EU users, not a demo. It is also the backbone of an 8-session AI Champions workshop; each session ships one vertical slice end to end.
- MVP loop: capture wardrobe → build profile → ask for an occasion → get outfits → react / wear → better next time.

## Where to look

Read these on demand rather than up front:

- `docs/requirements.md`: product scope, functional requirements (F1–F6), GDPR requirements, AI quality bar, workshop plan, open questions. Source of truth for *what* to build.
- `docs/tasks/README.md` and `docs/tasks/<slice>.md`: per-task specs (S1-01 … S6-01, F01–F10).
- `frontend/src/config/environment.template.ts`: template for frontend env config.
- `backend/lambda/README.md`: container-lambda build, push and deploy workflow.

## Tech stack

- **Frontend** (`frontend/`): React 19 + TypeScript + Vite, MUI, React Router, `idb` for IndexedDB. Mobile-first PWA.
- **Backend** (`backend/lambda/`): AWS Lambda functions in Go, built and deployed as container images (ECR).
- **Infrastructure** (`terraform/`): Terraform for API Gateway, Lambda/ECR, frontend hosting, etc.
- **CI/CD** (`.github/workflows/`): workflows for frontend, terraform and lambda containers.
- **Package manager**: Bun for the frontend (`bun install --frozen-lockfile`, `bun test --run`). Do not add `npm install` steps.

## Layout

- `frontend/`
  - `src/`: React app code
  - `src/config/environment.ts`: app environment config (see the template alongside)
  - `vite.config.*.mjs`: mode-specific Vite configs
- `backend/lambda/`
  - `functions/<name>/main.go`: per-function entrypoints
  - `handlers/`, `models/`: shared code
  - `Dockerfile.template`: multi-stage docker build template for containerized lambdas
  - `build-all-functions.sh`: helper for building functions
  - `README.md`: container-lambda workflow details
- `terraform/`: IaC
- `docs/`: requirements and task specs

## Commands

### Frontend (from `frontend/`)

- Install: `bun install --frozen-lockfile`
- Dev server: `bun run dev`
- Tests: `bun test --run`
- Build (dev mode): `bun run build:dev`
- Build (prod/live mode): `bun run build:live`
- Lint: none. `bun run lint` prints a message and exits 0.

CI sets `VITE_ENVIRONMENT` and `VITE_API_BASE_URL` during builds.

### Backend (from `backend/lambda/`)

- Go tests: `go test ./...`
- Format: `gofmt -w .`
- Build and push container images: follow `backend/lambda/README.md` (docker-based flow).
- Run a lambda container locally:
  - `docker run -p 9000:8080 <image>`
  - `curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '<event-json>'`

### Terraform (from `terraform/`)

- `terraform init`
- `terraform plan -var="app_name=slay-drip" -var="environment=dev"`
- `terraform apply`

Run the narrowest relevant tests after touching an area. Do not leave dev servers running in automated sessions.

## CI/CD expectations

- Frontend workflow: Bun install, `bun test --run`, then `bun run build:dev` or `bun run build:live` depending on branch/inputs.
- Backend lambdas: deployed as container images (ECR + Lambda image updates); see `backend/lambda/README.md`.
- Terraform workflows manage AWS infrastructure.
- If you change scripts or build behaviour, keep the corresponding workflow(s) consistent.

## Conventions

- **TypeScript/React**: small components and hooks with clear responsibilities. Side effects go in hooks or services; components stay mostly declarative. Add or adjust tests under `frontend/src/**/__tests__/` when behaviour changes.
- **Go**: run `gofmt` on touched packages. Keep handler logic thin; share reusable logic in `handlers/` and `models/`.
- **Strings**: all UI copy goes through externalised strings, ready for later localisation.
- **Config**: frontend values are injected via `VITE_*` vars at build time. Backend uses AWS environment variables and roles. Never hardcode secrets. Prefer the existing templates over new config mechanisms.
- **Git**: prefer incremental commits with focused messages.

## When making changes

- Keep changes scoped to the requested task.
- Run the narrowest relevant tests (frontend `bun test --run`, backend `go test ./...`).
- Add dependencies with `bun add` / `bun add -d` and commit lockfile changes.

## Hard rules (non-negotiable)

These come from `docs/requirements.md` and apply to every change, including tests, prompts and sample data.

- **18+ only**, enforced at sign-up. Users under 18 are out of scope.
- **Granular, revocable consent** per data type (body photo, measurements, wardrobe photos, weather/location). Revoking consent deletes that data.
- **EU-only processing**: all storage and AI inference in EU regions, with vendors under a zero-retention, no-training DPA.
- **No identification**: no face recognition, no matching users across accounts. Body photos are never used to identify anyone.
- **Special-category data**: modesty and adaptive-needs fields may be GDPR Art. 9 data. Assume explicit consent is required for these fields; DPO/legal review is still open.
- **Body-talk guardrails**: never mention weight, and never use flaw language ("hide", "slimming", "unflattering"), even in candid mode. Candid mode may be frank about fit and proportion, never about a body's worth.
- **Hard constraints are hard filters**: availability, weather, modesty and adaptive constraints must hold 100% of the time and are checked automatically. Never trade them off for ranking quality.
- **Honest outputs**: if the wardrobe cannot satisfy a request, say so and offer a gap suggestion. Do not return a weak outfit to fill the slot.
- **Transparency**: each recommendation states which signals it used.
- **Accessibility**: UI meets WCAG 2.1 AA.
- **Test data**: workshop sessions use only synthetic, freely licensed personas. Never introduce real personal data into the repo.
- **Secrets and config**: never hardcode secrets; backend relies on AWS env vars and roles.

## Quality bar for AI features

- Tagging accuracy is measured per attribute against hand-labelled items.
- Outfit generation returns first results in ≤ 10 s at p95; tagging runs in the background.
- Outfit quality is scored by a rubric (coherence, occasion fit, colour harmony, rationale honesty) with an LLM judge plus spot human review.
- Fairness: comparable quality scores across body types and skin tones in the golden set.
- Track AI cost per active user per month from day one.

## Open decisions

Do not decide these yourself; flag them if a task depends on them: product owner and IP, pilot user group, EU-hosted model choice (spike before session 2), DPO review of special-category fields, product name.
