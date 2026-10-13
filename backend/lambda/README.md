# API Container - Scaleway Serverless Containers

This directory contains the Slay Drip REST API. It is a single Go HTTP server built as a container image, pushed to the **Scaleway Container Registry** and run on **Scaleway Serverless Containers**. Data is stored in a **Scaleway Serverless SQL Database** (PostgreSQL-compatible).

The directory is still named `lambda/` from the earlier design; it no longer uses AWS Lambda.

## Overview

- **Single container:** one binary serves all routes. Serverless Containers route HTTP to one container per endpoint, so the routes live in Go rather than in one container per function.
- **Scaleway-only:** no AWS services are used for the backend.
- **EU region:** deploy to `fr-par` (Paris) by default. Keep all storage and inference in EU regions (see `CLAUDE.md`).

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│   GitHub Code   │───▶│  Docker Build   │───▶│  Scaleway Container │
└─────────────────┘    └─────────────────┘    │  Registry (rg.*)    │
                                              └──────────┬──────────┘
                                                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│ Serverless SQL  │◀───│  API container  │◀───│ Serverless          │
│ Database (PG)   │    │  (Go, port 8080)│    │ Containers (HTTPS)  │
└─────────────────┘    └─────────────────┘    └─────────────────────┘
```

## Endpoints

| Route | Purpose |
|-------|---------|
| `GET /api/v1/items` | Retrieve all items |
| `GET /api/v1/items/{id}` | Retrieve specific item |
| `POST /api/v1/items` | Create new item |
| `GET /api/v1/outfits` | Retrieve all outfits |
| `GET /api/v1/outfits/{id}` | Retrieve specific outfit |
| `POST /api/v1/outfits` | Create new outfit |

## Local Development

### Prerequisites

- Docker
- Go 1.25+
- A PostgreSQL database for local runs (for example, a local Postgres container)

### Running Locally

1. **Start a local PostgreSQL:**
   ```bash
   docker run --rm -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16
   ```

2. **Run the API:**
   ```bash
   cd backend/lambda
   export DATABASE_URL="postgres://postgres:dev@localhost:5432/postgres?sslmode=disable"
   export ENVIRONMENT=dev
   go run ./functions/api
   ```

3. **Test with curl:**
   ```bash
   curl http://localhost:8080/api/v1/items
   ```

### Building the Container Locally

```bash
cd backend/lambda
docker build -f Dockerfile.template -t slay-drip-api:local .
docker run --rm -p 8080:8080 -e DATABASE_URL="..." slay-drip-api:local
```

### Environment Variables

- `DATABASE_URL` (required): PostgreSQL connection string for the Serverless SQL Database
- `ENVIRONMENT`: `dev` (default) or `live`
- `LOG_LEVEL`: optional override (defaults to `DEBUG` in dev, `INFO` in live)
- `PORT`: listen port (default `8080`; Scaleway sets this for the container)

For the build script:

- `SCW_SECRET_KEY` (required): Scaleway IAM secret key with Container Registry access
- `SCW_REGION` (optional): Scaleway region (default `fr-par`)

## Deployment

### Automated Deployment (GitHub Actions)

`.github/workflows/deploy-lambda-containers.yml`:

1. Builds the API image and pushes it to `rg.fr-par.scw.cloud/slay-drip-<env>/api:latest`
2. Triggers a redeploy of the Serverless Container so it pulls the new image
3. Smoke-tests `GET /api/v1/items`

**Trigger the workflow:**
- Push to `main` touching `backend/lambda/**` (automatic, deploys `dev`)
- Manual `workflow_dispatch` with `environment` set to `dev` or `live`

### Manual Deployment

1. **Build and push the image:**
   ```bash
   cd backend/lambda
   SCW_SECRET_KEY=... ./build-all-functions.sh dev
   ```

2. **Deploy infrastructure (creates the registry namespace, container and database):**
   ```bash
   cd terraform
   terraform init
   terraform plan -var="environment=dev"
   terraform apply -var="environment=dev"
   ```

3. **Redeploy the container to pick up the new image:**
   ```bash
   curl -X POST \
     -H "X-Auth-Token: $SCW_SECRET_KEY" \
     "https://api.scaleway.com/containers/v1beta1/regions/fr-par/containers/<container-id>/deploy"
   ```

## Infrastructure

Defined in `terraform/backend-lambdas-container.tf`:

- **Container Registry namespace:** `slay-drip-<env>` (private)
- **Serverless Containers namespace and container:** `slay-drip-api-<env>`, port 8080, scale-to-zero
- **Serverless SQL Database:** `slay-drip-<env>`, holds the `items` and `outfits` tables
- **Secrets:** `DATABASE_URL` is passed to the container as a secret environment variable

The `items` and `outfits` tables are created on startup by `models/postgres.go` (`CREATE TABLE IF NOT EXISTS`).

## Troubleshooting

1. **`DATABASE_URL environment variable is required`:** the container was started without the database secret. Check the container's secret environment variables in the Scaleway console.
2. **`failed to reach database`:** confirm the Serverless SQL Database is in the same region as the container, and that the connection string credentials are current.
3. **Image pull errors:** confirm the image was pushed to `rg.<region>.scw.cloud/slay-drip-<env>/api:latest` and that the container's registry namespace matches.
4. **Container returns 5xx on every route:** check the container logs in Scaleway Cockpit (Scaleway's logging and monitoring product).

## File Structure

```
backend/lambda/
├── Dockerfile.template            # Multi-stage container build (Go -> alpine)
├── build-all-functions.sh         # Builds and pushes the API image to Scaleway
├── functions/
│   └── api/main.go                # API entrypoint: routes, startup, migrations
├── handlers/                      # HTTP handlers and CORS middleware
├── models/                        # Data models and PostgreSQL store
├── config/                        # Environment configuration
├── go.mod                         # Go module definition
├── go.sum                         # Go module checksums
└── README.md                      # This file
```

## Contributing

1. Add or change routes in `functions/api/main.go`, and handler logic in `handlers/`
2. Put persistence changes in `models/postgres.go` (update the schema constant as well)
3. Run `gofmt -w .` and `go test ./...` from `backend/lambda/`
4. Test locally with Docker
5. Push to `main` to trigger the deployment workflow
6. Verify the deployment in the Scaleway console
