# ADR-0005: Local cloud emulation with Docker Compose stand-ins, S3 first

**Status:** Accepted
**Date:** 2026-10-21
**Deciders:** Outfit Planner team (product owner to confirm the tooling choice)
**Related:** [CLAUDE.md](../../CLAUDE.md) (Platform decisions, Working in this repo), [ADR-0001](0001-eu-hosting-18plus-gate-gdpr-baseline.md), [security guide](../security.md) (sections 4, 13), [local development guide](../local-development.md), [compose.yaml](../../compose.yaml)

## Context

The backend, the identity provider (F02) and object storage (user photos, see ADR-0004 for the on-device stance) all have to be built before the Scaleway project exists for every developer. Developers need to run the whole MVP loop on their own machine, offline, with no shared state and no cloud spend. Local run is therefore a first-class target: a feature is not done until it runs locally, and a local run must exercise the same code paths as production.

The constraints that shape the choice:

- **Scaleway is the cloud** (CLAUDE.md). AWS SDKs, CLIs and config are not added to the repo, so an AWS emulator is not a natural fit even though it is the most common option.
- **EU-only and synthetic data.** A local stack holds synthetic test personas only. No real personal data is loaded into it (CLAUDE.md, hard rule on test data).
- **No secrets in the repo.** Local credentials are throwaway values for one machine. They must not be reused in any other environment, and production values never appear in a compose file (security guide, section 4).
- **Same configuration shape everywhere.** Code reads an endpoint, a region, a path-style flag and credentials from config. Only their values change between a laptop, CI and Scaleway.

We checked the state of the candidates on 2026-10-21:

- LocalStack's 2026.03.0 release requires an auth token to start, and its free plan is for non-commercial use only ([LocalStack release notes](https://blog.localstack.cloud/localstack-for-aws-release-2026-03-0/)). Its open-source status is reported inconsistently across sources, so we would be betting on a licence we cannot confirm.
- MinIO Community Edition has been retired upstream. Third-party reports (not verified against MinIO's own release notes) describe removed Docker Hub images and no further security patches ([summary](https://glukhov.org/data-infrastructure/object-storage/minio-dead/)). We would not start new work on it.
- Scaleway has no official local emulator. Its Object Storage speaks the S3 API, so any S3-compatible server can stand in for it.
- We verified locally that `chrislusf/seaweedfs:4.22` starts with the S3 gateway on port 8333, enforces SigV4 auth, and passes a PUT, GET, compare and DELETE round trip.

## Decision

We will run local stand-ins for Scaleway services as Docker Compose services in the repo root `compose.yaml`. Each stand-in speaks the same protocol as its Scaleway counterpart and is configured through the same keys the app uses in production. The first stand-in is **S3 object storage using SeaweedFS**, pinned to `chrislusf/seaweedfs:4.22` (Apache-2.0).

- **One contract, many environments.** The app reads `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`, and credentials from environment variables. Locally they point at `http://127.0.0.1:8333`, `fr-par`, path style. In Scaleway they point at `https://s3.fr-par.scw.cloud` with the Scaleway region and credentials from the container environment.
- **Local run is a feature requirement.** Any feature that touches a cloud service must run against the local stack before it ships. Its spec and PR say how to run it, and it has a test that passes locally (see [local development guide](../local-development.md)).
- **Stand-ins are for development and tests only.** They are never a production dependency and never receive real personal data.
- **Scaleway-specific behaviour is checked in a dev project.** Behaviour the stand-in does not reproduce (IAM and bucket policies, lifecycle rules, encryption settings) is verified on a Scaleway dev project in an allowed region, not assumed from the local run.

Identity provider and backend emulation follow the same pattern. Each gets its own ADR and compose service when it is built. They are not chosen here.

## Options considered

### Option A: LocalStack (rejected)

- Pros: broad AWS service coverage, a large community, good docs.
- Cons: requires an auth token and non-commercial licence terms for the free plan. It is an AWS emulator, which pulls AWS-branded SDK and config into a repo that avoids them. It emulates services Scaleway does not offer, so developers could build against AWS-only behaviour.

### Option B: MinIO (rejected)

- Pros: the most-used self-hosted S3 server, with a familiar console.
- Cons: Community Edition is retired upstream. Reports describe removed images and no further security patches. Starting new work on it creates a migration.

### Option C: SeaweedFS (chosen)

- Pros: Apache-2.0. Single container with S3 on a standard port, with `server -s3` starting the whole stack. Actively maintained. Verified locally against the pinned tag.
- Cons: not an official Scaleway tool, so fidelity is checked by our own smoke test. The S3 surface is large, so some features may differ from Scaleway's.

### Option D: Garage (considered)

- Pros: built by Deuxfleurs in France, S3-compatible, designed for small self-hosted deployments.
- Cons: AGPL, which is a heavier licence for a tool we only run locally. Needs a cluster layout step before it accepts requests, which adds local setup friction. Not verified end to end here.

### Option E: Adobe S3Mock (considered)

- Pros: small, aimed at test suites, usable from JVM tests.
- Cons: a development emulator with no IAM, and a smaller S3 surface. Tied to a JVM test workflow we have not chosen.

### Option F: Scaleway dev project only (rejected as the only option)

- Pros: exact fidelity, with no local tooling.
- Cons: needs network access and a cloud project for every developer. Shared state makes tests flaky. Costs money per run. Fails the offline and first-class local run requirement.

### Option G: In-process fakes in tests only (rejected as the only option)

- Pros: fast, no containers.
- Cons: cannot prove that the real client, endpoint and signing work. Drift from the real service is invisible until staging.

## Consequences

- Positive: developers can run the storage path offline with one command. The app's config contract is exercised locally, which catches endpoint, region and path-style mistakes before staging. No AWS tooling enters the repo.
- Negative: the stand-in is not Scaleway. Some Scaleway behaviours, such as IAM policy evaluation, need a dev-project check. Developers must remember `docker compose down -v` to wipe local data. The image is pinned by tag, not digest. Record the digest when we next review it.
- Negative: the S3 client library is not chosen here. Scaleway's own docs use the AWS SDK pointed at a custom endpoint. CLAUDE.md forbids adding AWS SDKs, so the client choice needs its own decision, in the stack ADR, before code depends on it.
- Follow-up work:
  - Stack ADR: choose the backend language and the S3 client library. Record the AWS-SDK-or-not question there.
  - Identity provider ADR (F02): choose the identity provider and its local compose service. Keycloak is a candidate under the self-hosted direction in ADR-0001. Not decided.
  - Session 1 walking skeleton spec: include the local run steps as an acceptance criterion.
  - Scaleway dev project in `fr-par`: needed before the first staging deploy, to verify IAM and bucket policy behaviour.

## Compliance check

- [x] EU-only processing. The stand-in runs on the developer's machine and keeps data on local disk only. No data is sent to a vendor. Docker Hub pulls carry no personal data. Scaleway regions apply to any shared environment.
- [x] Consent and retention impact (granular, revocable). Not applicable: only synthetic data enters the stack. Wiping local volumes is the deletion path.
- [x] Special-category data impact (modesty and adaptive fields). Not applicable: synthetic personas only.
- [x] Hard constraints remain hard filters. Not affected.
- [x] Test data is synthetic. The smoke test writes a single timestamped text file, not user content.
- [x] Secrets: local credentials are in `infra/dev/s3.json`, are throwaway, and are not reused anywhere else. Production values never appear in compose or the repo.

## Revisit when

- Scaleway ships an official local emulator, or the chosen stand-in is no longer maintained.
- A feature needs a Scaleway behaviour the stand-in cannot reproduce, and a dev-project check is not enough.
- The S3 client library decision is made, which may change how the path-style flag is set.
- The identity provider ADR is accepted, so its local service can be added to `compose.yaml`.
