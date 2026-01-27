# AGENTS.md

Guidance for coding agents (and humans) working in this repository.

## Repository overview

This repo contains:

- **Frontend**: React + TypeScript + Vite, using **Bun** for package management and tests (`frontend/`).
- **Backend**: AWS Lambda functions in **Go**, built and deployed as **container images** (`backend/lambda/`).
- **Infrastructure**: Terraform for AWS resources (API Gateway, Lambda/ECR, frontend hosting, etc.) (`terraform/`).

## Layout

- `frontend/`
  - `src/`: React app code
  - `src/config/environment.ts`: app environment config (see template alongside)
  - `vite.config.*.mjs`: mode-specific Vite configs
- `backend/lambda/`
  - `functions/<name>/main.go`: per-function entrypoints
  - `handlers/`, `models/`: shared code
  - `Dockerfile.template`: multi-stage docker build template used for containerized lambdas
  - `build-all-functions.sh`: helper script(s) for building functions
  - `README.md`: container-lambda workflow details
- `.github/workflows/`: CI/CD workflows for frontend, terraform, and lambda containers
- `terraform/`: IaC

## Local development (common commands)

### Frontend

From `frontend/`:

- **Install**: `bun install --frozen-lockfile`
- **Dev server**: `bun run dev`
- **Tests**: `bun test --run`
- **Build (dev mode)**: `bun run build:dev`
- **Build (prod/live mode)**: `bun run build:live`

Notes:

- CI sets `VITE_ENVIRONMENT` and `VITE_API_BASE_URL` during builds.
- There is currently no lint step (`bun run lint` prints a message and exits 0).

### Backend (Go lambdas)

From `backend/lambda/`:

- **Go tests** (if present): `go test ./...`
- **Format**: `gofmt -w .`
- **Build container images**: follow `backend/lambda/README.md` (docker-based build/push flow).

To run a lambda container locally, the README shows the standard AWS Lambda Runtime Interface Emulator endpoint:

- Run: `docker run -p 9000:8080 <image>`
- Invoke: `curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '<event-json>'`

### Terraform

From `terraform/`:

- `terraform init`
- `terraform plan -var="app_name=slay-drip" -var="environment=dev"`
- `terraform apply`

## CI/CD expectations

- **Frontend** workflow uses Bun to install deps, run `bun test --run`, then builds via `bun run build:dev` or `bun run build:live` depending on branch/inputs.
- **Backend lambdas** are deployed as container images (ECR + Lambda image updates); see `backend/lambda/README.md`.
- **Terraform** workflows manage AWS infrastructure.

If you update scripts or build behavior, ensure the corresponding workflow(s) remain consistent.

## Coding conventions

- **TypeScript/React**
  - Prefer small components and hooks with clear responsibilities.
  - Keep side effects in hooks/services; keep components mostly declarative.
  - Add/adjust tests under `frontend/src/**/__tests__/` when changing behavior.
- **Go**
  - Run `gofmt` on touched packages.
  - Keep handler logic thin; share reusable logic in `handlers/` and `models/`.
- **General**
  - Prefer incremental commits with focused messages.
  - Avoid long-running commands in automated agent sessions (e.g., don’t leave dev servers running).

## Environment & configuration

- Frontend environment values are injected via `VITE_*` vars at build time (see CI workflow).
- Backend uses AWS environment variables/roles; do not hardcode secrets.
- Prefer using the existing templates (e.g., `frontend/src/config/environment.template.ts`) rather than inventing new config mechanisms.

## When making changes

- Keep changes scoped to the requested task.
- Run the narrowest relevant tests (frontend `bun test --run`, backend `go test ./...`) when you touch those areas.
- If you add a new dependency, use Bun (`bun add` / `bun add -d`) and commit lockfile changes.
