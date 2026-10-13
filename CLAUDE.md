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
- `docs/tasks/README.md` and `docs/tasks/<slice>.md`: per-task specs (S1-01 … S6-01, F01–F10).
- `frontend/src/config/environment.template.ts`: template for frontend env config.
- `backend/lambda/README.md`: API container build, push and deploy workflow (Scaleway).

## Tech stack

- **Cloud provider: Scaleway, not AWS.** All hosting, storage, databases, container registries, CI credentials and AI inference run on Scaleway in EU regions (`fr-par` by default). Do not add AWS resources, SDKs, CLIs or config; the AWS stack has been retired.
- **Frontend** (`frontend/`): React 19 + TypeScript + Vite, MUI, React Router, `idb` for IndexedDB. Mobile-first PWA. Hosted on Scaleway Object Storage (static website).
- **Backend** (`backend/lambda/`): a single Go REST API served from one container image on Scaleway Serverless Containers (image in the Scaleway Container Registry). Data lives in a Scaleway Serverless SQL Database (PostgreSQL-compatible).
- **Infrastructure** (`terraform/`): Terraform with the `scaleway/scaleway` provider for the registry, containers, SQL database, Object Storage and CI access.
- **CI/CD** (`.github/workflows/`): workflows for frontend, terraform and the API container. Authenticate with Scaleway IAM API keys held in GitHub environment secrets.
- **Package manager**: Bun for the frontend (`bun install --frozen-lockfile`, `bun test --run`). Do not add `npm install` steps.

## Layout

- `frontend/`
  - `src/`: React app code
  - `src/config/environment.ts`: app environment config (see the template alongside)
  - `vite.config.*.mjs`: mode-specific Vite configs
- `backend/lambda/` (directory name predates the move to Scaleway)
  - `functions/api/main.go`: API entrypoint (routes, startup, schema migration)
  - `handlers/`, `models/`, `config/`: HTTP handlers, PostgreSQL store, environment config
  - `Dockerfile.template`: multi-stage docker build for the API container
  - `build-all-functions.sh`: builds and pushes the API image to the Scaleway Container Registry
  - `README.md`: API container workflow details
- `terraform/`: IaC (Scaleway provider)
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
- Build and push the API image to Scaleway: follow `backend/lambda/README.md` (docker-based flow, `SCW_SECRET_KEY` required).
- Run the API container locally (needs a PostgreSQL `DATABASE_URL`):
  - `docker run -p 8080:8080 -e DATABASE_URL=<url> <image>`
  - `curl http://localhost:8080/api/v1/items`

### Terraform (from `terraform/`)

- `terraform init`
- `terraform plan -var="environment=dev"` (with `TF_VAR_scw_project_id` and `TF_VAR_database_url` set; see `terraform/local-run.readme`)
- `terraform apply`

Run the narrowest relevant tests after touching an area. Do not leave dev servers running in automated sessions.

## CI/CD expectations

- Frontend workflow: Bun install, `bun test --run`, then `bun run build:dev` or `bun run build:live` depending on branch/inputs.
- Backend API: deployed as a container image (Scaleway Container Registry, then a Serverless Containers redeploy); see `backend/lambda/README.md`.
- Terraform workflows manage Scaleway infrastructure.
- If you change scripts or build behaviour, keep the corresponding workflow(s) consistent.

## Conventions

- **TypeScript/React**: small components and hooks with clear responsibilities. Side effects go in hooks or services; components stay mostly declarative. Add or adjust tests under `frontend/src/**/__tests__/` when behaviour changes.
- **Go**: run `gofmt` on touched packages. Keep handler logic thin; share reusable logic in `handlers/` and `models/`.
- **Strings**: all UI copy goes through externalised strings, ready for later localisation.
- **Config**: frontend values are injected via `VITE_*` vars at build time. Backend reads its settings (`DATABASE_URL`, `ENVIRONMENT`) from environment variables set on the Scaleway container, and CI uses Scaleway IAM keys from GitHub secrets. Never hardcode secrets. Prefer the existing templates over new config mechanisms.
- **Git**: prefer incremental commits with focused messages.

## When making changes

- Keep changes scoped to the requested task.
- Add dependencies with `bun add` / `bun add -d` and commit lockfile changes.

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

## Quality bar for AI features

- Tagging accuracy is measured per attribute against hand-labelled items.
- Outfit generation returns first results in ≤ 10 s at p95; tagging runs in the background.
- Outfit quality is scored by a rubric (coherence, occasion fit, colour harmony, rationale honesty) with an LLM judge plus spot human review.
- Fairness: comparable quality scores across body types and skin tones in the golden set.
- Track AI cost per active user per month from day one.

## Open decisions

Do not decide these yourself; flag them if a task depends on them: product owner and IP, pilot user group, EU-hosted model choice (spike before session 2), DPO review of special-category fields, product name, identity provider for user accounts (F02; Scaleway has no managed user directory, so this needs a choice such as self-hosted Keycloak or an EU-hosted SaaS).
