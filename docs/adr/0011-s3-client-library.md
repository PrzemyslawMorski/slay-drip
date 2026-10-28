# ADR-0011: minio-go as the S3 client for wardrobe photos

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Outfit Planner team (taken with the wardrobe persistence slice; product owner to review)
**Related:** [ADR-0005](0005-local-cloud-emulation.md) (S3 stand-in, which left the client library open), [ADR-0007](0007-backend-go-and-test-stack.md) (Go backend), [ADR-0008](0008-postgresql-data-store-and-migrations.md) (metadata in PostgreSQL), [ADR-0004](0004-on-device-wardrobe-storage.md) (photos never leave the device for anonymous users), [CLAUDE.md](../../CLAUDE.md) (no AWS SDKs, CLIs or config)

## Context

Logged-in users persist wardrobe photos on the server. The bytes go to S3-compatible object storage: SeaweedFS locally and Scaleway Object Storage in production (ADR-0005). The metadata goes to PostgreSQL (ADR-0008).

ADR-0005 said the client library needed its own decision. CLAUDE.md forbids adding AWS SDKs, CLIs or config, and Scaleway's own documentation points at the AWS SDK. The choice has to be recorded before code depends on it.

The constraints:

- The client must speak the S3 protocol with path-style and virtual-host addressing, selected by `S3_FORCE_PATH_STYLE`.
- It must work against both SeaweedFS and Scaleway with the same config keys (ADR-0005).
- Dependencies need a licence that allows commercial use, and a maintained project.
- Signing must use SigV4. Hand-written signing is a security-sensitive area we would own.

## Decision

We will use **`github.com/minio/minio-go/v7`** (Apache-2.0) as the S3 client, behind the `wardrobe.Blobs` port in `backend/internal/storage/`. The AWS SDK for Go stays out of the repo.

## Options considered

### Option A: minio-go v7 (chosen)

- Pros: S3-compatible, with path-style and virtual-host addressing. Maintained, Apache-2.0. A small surface: `PutObject`, `GetObject`, `RemoveObject`. Not an AWS SDK, so it fits CLAUDE.md. Works against SeaweedFS in local runs.
- Cons: a MinIO-branded project, so the import path names MinIO. Its dependency tree is larger than the port needs.

### Option B: AWS SDK for Go v2 (rejected)

- Pros: the most widely used S3 client, and Scaleway documents it.
- Cons: CLAUDE.md forbids AWS SDKs in this repo. It also pulls AWS-branded config into a repo that avoids it.

### Option C: Hand-written SigV4 on `net/http` (rejected)

- Pros: no dependency.
- Cons: we would own the signing code, which is a security-sensitive area. Every S3 quirk would be ours to find.

## Consequences

- Positive: one S3 client for both local and production. The config keys match `docs/local-development.md`. The adapter is behind a port, so a different client needs only a new adapter and the shared contract test in `backend/internal/wardrobe/blobcontract/`.
- Negative: the Scaleway path is not yet verified. The integration test runs only against SeaweedFS. Before a staging deploy, the same integration test must run against a Scaleway dev bucket in an allowed region (`fr-par`, `nl-ams` or `pl-waw`).
- Follow-up work:
  - Verify path-style and virtual-host behaviour against Scaleway Object Storage on a dev bucket before the deploy spike.
  - Bucket creation and lifecycle are owned by infrastructure, not by the application.

## Compliance check

- [x] EU-only processing: the client has no region or endpoint of its own, so the endpoint and region come from config. Local values are `127.0.0.1` and `fr-par`.
- [x] No AWS SDK, CLI or AWS config in the repo (CLAUDE.md).
- [x] Secrets come from the environment and are never logged. The adapter does not log keys or object names.
- [x] Personal data: photos are stored server-side only for consenting logged-in users. Revocation deletes them (see [ADR-0004](0004-on-device-wardrobe-storage.md), as amended for accounts).
- [x] Test data is synthetic: the integration tests generate their own images.

## Revisit when

- Scaleway Object Storage behaves differently from SeaweedFS under the same config keys.
- minio-go is no longer maintained, or its licence changes.
- The platform decision changes and an AWS SDK becomes allowed (a superseding ADR would be needed).
