# Local development

Local run is a first-class target. Every feature that touches a cloud service must run on a developer's machine with the commands below, using the same config keys as production. The decision and its alternatives are in [ADR-0005](adr/0005-local-cloud-emulation.md).

## Prerequisites

- Docker (Docker Desktop on Windows or macOS, Docker Engine on Linux) with Compose v2.
- `bash` and `curl` for the smoke script. On Windows, Git Bash provides both.
- Go 1.27.3 or later for the backend. The `go` command downloads the toolchain named in `backend/go.mod` on first use.

## Start and check the object storage stand-in

```bash
docker compose up -d                 # start PostgreSQL on 127.0.0.1:5432 and the S3 stand-in on 127.0.0.1:8333
bash scripts/dev/s3-smoke.sh         # create the dev bucket and round-trip one object
```

A passing run ends with `OK: S3 round-trip passed`. Run it again whenever you change the stand-in or its config.

Stop the stack without losing data with `docker compose stop`. Wipe all local data with `docker compose down -v`. Local data is synthetic only, so wiping is always safe.

## Start and check the identity stand-in

```bash
docker compose up -d keycloak        # start Keycloak on 127.0.0.1:8180 (realm imported from infra/dev/keycloak/realm/)
bash scripts/dev/keycloak-smoke.sh   # discovery, JWKS, PKCE sign-in, admin lifecycle, registration setting
```

A passing run ends with `OK: Keycloak smoke passed`. Run it again after any change to the realm file or to `compose.yaml`.

The pinned image is `keycloak/keycloak:26.8.1` (checked on Docker Hub on 2026-10-28; bump it deliberately). The bootstrap admin for the local console is in `infra/dev/keycloak/local-admin.conf` (throwaway). The local realm has no named volume, so each start imports from the committed realm file. Local realm users are synthetic (`*@example.test`). Self-service registration is on in this realm only (ADR-0010 amendment), so the Keycloak sign-in page offers a registration form for test users.

## Backend

Run these from `backend/`.

| Task | Command | What it does |
| --- | --- | --- |
| Format | `go tool golangci-lint fmt ./...` | Format with gofmt and goimports |
| Vet | `go vet ./...` | Standard vet checks |
| Lint | `go tool golangci-lint run ./...` | Lint with the rules in `backend/.golangci.yml` |
| Vulnerabilities | `go tool govulncheck ./...` | Known vulnerabilities in dependencies and the Go standard library |
| Unit tests | `go test ./...` | The inner loop, no Docker |
| Unit tests, race | `go test -race ./...` | Race detector. Needs cgo, so CI runs it on Linux |
| Integration tests | `DATABASE_URL=... go test -tags=integration ./...` | Against the compose PostgreSQL |
| Migrate up | `go run -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@v4.20.1 -path migrations -database "$DATABASE_URL" up` | Apply migrations |
| Migrate down | same, with `down 1` | Roll back the last migration |

Run the API with `go run ./cmd/api` (listens on `PORT`, default 8080). `GET /healthz` returns `{"status":"ok"}`.

## Config contract

The app reads these keys. It must not hard-code any of them, and the same names are used in every environment.

| Key | Local value | Scaleway value |
| --- | --- | --- |
| `S3_ENDPOINT` | `http://127.0.0.1:8333` | `https://s3.fr-par.scw.cloud` (or the region in use) |
| `S3_REGION` | `fr-par` | `fr-par`, `nl-ams` or `pl-waw` |
| `S3_BUCKET` | `slay-drip-local` | per-environment bucket name |
| `S3_FORCE_PATH_STYLE` | `true` | `false` unless a reason is recorded |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `slaydrip-local` / `slaydrip-local-secret` (in `infra/dev/s3.json`) | from the container environment, never from source |
| `DATABASE_URL` | `postgres://slaydrip:slaydrip-local-secret@127.0.0.1:5432/slaydrip?sslmode=disable` (in `compose.yaml`) | from the container environment, never from source |
| `OIDC_ISSUER_URL` | `http://127.0.0.1:8180/realms/slay-drip` | `https://<keycloak host>/realms/slay-drip` (host set at deploy) |
| `OIDC_JWKS_URL` | `http://127.0.0.1:8180/realms/slay-drip/protocol/openid-connect/certs` | `https://<keycloak host>/realms/slay-drip/protocol/openid-connect/certs` (host set at deploy) |
| `OIDC_CLIENT_ID` | `slay-drip-pwa` | `slay-drip-pwa` (public configuration, may be in the client build) |
| `OIDC_AUDIENCE` | `slay-drip-api` | `slay-drip-api` |
| `OIDC_REDIRECT_URI` | `http://localhost:5173/auth/callback` | `https://<PWA origin>/auth/callback` (public configuration) |
| `KEYCLOAK_BASE_URL` | `http://127.0.0.1:8180` | `https://<keycloak host>` (set at deploy) |
| `KEYCLOAK_REALM` | `slay-drip` | `slay-drip` |
| `KEYCLOAK_ADMIN_CLIENT_ID` | `slay-drip-backend-admin` | `slay-drip-backend-admin` |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | throwaway local value in `infra/dev/keycloak/realm/slay-drip-realm.json` | from the container environment, never from source |

Local values are throwaway and are only valid against the local stand-in. Do not reuse them anywhere else.

The smoke script reads the same names, so you can point it at another S3-compatible endpoint with `S3_ENDPOINT=... bash scripts/dev/s3-smoke.sh`.

## Adding a stand-in for a new service

1. Add a service to `compose.yaml` that speaks the same protocol as the Scaleway service, with its image pinned by tag.
2. Put its local credentials in `infra/dev/`, never in an `.env` file. Agents must not read `.env` files (CLAUDE.md).
3. Read its endpoint and credentials through the config contract above, with a new key for each value.
4. Add a smoke check under `scripts/dev/` that proves the round trip, in the same style as `s3-smoke.sh`.
5. Record the choice in an ADR, and link it from the spec.

## Feature checklist (local run)

Before a feature that uses a cloud service is marked done, its PR must show:

- [ ] The compose services it needs, and whether they are already in `compose.yaml`.
- [ ] The config keys it reads, and their local values.
- [ ] A command that runs the feature against the local stack, and a passing run.
- [ ] Synthetic data only.

## What the local stack does not prove

- Keycloak production settings. The local store is the Keycloak dev file store with no volume, not PostgreSQL. Realm settings such as registration and token lifetimes need review before any Scaleway deployment (ADR-0010).
- Scaleway IAM and bucket policies, lifecycle rules and encryption settings. Check these on a Scaleway dev project in an allowed region before a staging deploy.
- Performance. Local latency says nothing about the 10 s p95 target in CLAUDE.md.
- Pinned versions of Scaleway's own API. The stand-in implements the S3 protocol, not Scaleway's management API.

## Troubleshooting

- **Port 8333 already in use:** stop the other process, or change the host port in `compose.yaml` and set `S3_ENDPOINT` to match.
- **`SignatureDoesNotMatch` (HTTP 403):** the secret in your environment does not match `infra/dev/s3.json`.
- **Smoke script fails before the first request:** check `docker compose ps`. The container must be `Up`.
- **Port 8180 already in use:** another Keycloak stack may be running, often from an older checkout. Check with `docker ps`, then stop that stack with `docker compose -p <project> stop` (not `down -v`). Or change the host port in `compose.yaml` and update `OIDC_ISSUER_URL`, `OIDC_JWKS_URL` and `KEYCLOAK_BASE_URL` to match.
- **Realm change not picked up:** the import runs on container start. Run `docker compose up -d --force-recreate keycloak`.
- **`invalid_redirect_uri` or an issuer mismatch:** the redirect URI and `KC_HOSTNAME` must match `OIDC_REDIRECT_URI` and `OIDC_ISSUER_URL`. Use `127.0.0.1` in the issuer, not `localhost`.
- **Image tag check:** confirm the pinned tag exists with `docker pull keycloak/keycloak:26.8.1`, and compare it with the tags listed on Docker Hub before you bump it.
- **Smoke step 3 fails at the login form:** the Keycloak login markup changed. Update the parse in `scripts/dev/keycloak-smoke.sh`.
- **`migrate-up` fails with `first .: file does not exist`:** `backend/migrations/` has no migrations yet. The first migration arrives with the first feature that stores server-side data (ADR-0008).
