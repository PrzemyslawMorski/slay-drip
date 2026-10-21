# ADR-0008: PostgreSQL 17 as the data store, with pgx and golang-migrate

**Status:** Proposed
**Date:** 2026-10-21
**Deciders:** Outfit Planner team (product owner and DPO to confirm before any personal data is stored)
**Related:** [ADR-0005](0005-local-cloud-emulation.md) (local cloud emulation), [ADR-0006](0006-development-feedback-loops-ports-and-fakes.md) (ports and fakes, integration loop), [ADR-0007](0007-backend-go-and-test-stack.md) (Go backend and test stack), [local development guide](../local-development.md), [CLAUDE.md](../../CLAUDE.md) (Platform decisions)

## Context

CLAUDE.md requires a record for any data-store decision, and none exists yet. ADR-0006 and ADR-0007 already assume a PostgreSQL service for the integration loop. The backend will hold accounts, consent records, wardrobe metadata and outfits on the server once the backend exists. ADR-0004 keeps photos on the device for now, so the server holds metadata only.

Constraints that shape the choice:

- **Scaleway hosts the database** in an allowed EU region (CLAUDE.md, ADR-0001). Scaleway offers Managed PostgreSQL, so the engine has to be one that Scaleway runs.
- **Local fidelity.** The integration loop must run the same engine, so the local stand-in is the real database rather than an emulator (ADR-0005).
- **Consent deletion** must remove data in one transaction across the affected tables (ADR-0004, security guide section 3). That needs a database with real transactions and foreign keys.
- **Go backend** (ADR-0007). The driver and migration tool should be the standard choices in the Go ecosystem.

## Decision

We will use **PostgreSQL 17** as the application database, on Scaleway Managed PostgreSQL in production and the pinned `postgres:17` image locally. The Go backend connects with **`pgx/v5`** (`pgxpool` for the connection pool). Schema changes are versioned SQL migrations applied with **`golang-migrate`**, stored in `backend/migrations/`.

- **Engine version:** PostgreSQL 17, the version pinned in `compose.yaml`. Moving to a newer major version is a deliberate change and needs its own note here.
- **Access:** the app uses `pgxpool` directly with SQL. No ORM. Queries are written by hand and checked by the integration tests.
- **Migrations:** plain `.up.sql` and `.down.sql` files named `NNNNNN_description`. Migrations are never edited after they have been applied anywhere shared. Fix forward with a new migration.
- **Credentials:** `DATABASE_URL` comes from the container environment in production and from the throwaway local value in `compose.yaml` locally. It is never committed for a shared environment.
- **Transactions:** consent withdrawal and account deletion run in a single transaction, as ADR-0004 requires for wardrobe data.

## Options considered

### Option A: PostgreSQL with pgx and golang-migrate (chosen)

- Pros: Scaleway Managed PostgreSQL runs the same engine, so local and production behave alike. Transactions and foreign keys support consent deletion. `pgx` is the most used PostgreSQL driver for Go. `golang-migrate` is the common migration tool and works with plain SQL files.
- Cons: hand-written SQL means more code to review. `golang-migrate` has no automatic down-migration generation, so every down file is written by hand.

### Option B: PostgreSQL with an ORM (GORM or Ent) (rejected)

- Pros: less boilerplate for simple CRUD. Model-driven migrations in some tools.
- Cons: hides query behaviour that the consent and deletion rules depend on. Adds a second source of truth for the schema, the models, which can drift from the migrations. Harder to review for data-protection rules.

### Option C: Scaleway Serverless SQL (rejected for now)

- Pros: managed, no server to size, pay per use.
- Cons: a different product from Managed PostgreSQL, so local fidelity would be weaker and we would need to check its feature set and EU residency separately. Not yet verified against our needs. Revisit once the Scaleway options are compared in a discovery note.

### Option D: SQLite (rejected)

- Pros: no separate server, simplest local setup.
- Cons: a different engine from production, so SQL behaviour differs. Concurrency and deployment models do not match a hosted API.

## Consequences

- Positive: one engine from laptop to production. Transaction and deletion rules can be tested for real in the integration loop. The Go ecosystem tooling is standard and well documented.
- Negative: migrations must be written and reviewed by hand. `golang-migrate` run through `go run` downloads the CLI on first use, so the first migration run needs network access. The migrate command fails on an empty `backend/migrations/` directory, so it works from the first migration onwards.
- Follow-up work:
  - Write the first migration with the first feature that stores server-side data (account and consent records, F02 and the S1 walking skeleton).
  - Add a discovery note comparing Managed PostgreSQL and Serverless SQL on Scaleway, with the EU regions each supports.
  - Record the backup and point-in-time-recovery settings for Managed PostgreSQL in the security guide's encryption section (section 13).
  - Confirm that Managed PostgreSQL encrypts data at rest and in transit by default, or record the gap.

## Compliance check

- [x] EU-only processing. Managed PostgreSQL runs in `fr-par`, `nl-ams` or `pl-waw`. Local data lives on the developer's disk. No vendor receives data. The Scaleway region must be confirmed on the database resource before personal data is stored.
- [x] Consent and retention impact (granular, revocable). The schema must hold consent records per data type and delete data on withdrawal, in one transaction. Retention periods are not set yet and need DPO input.
- [x] Special-category data impact (modesty and adaptive fields). Not applicable to this decision. Columns for those fields need their own review before they are added.
- [x] Hard constraints remain hard filters. Not affected by the store.
- [x] Test data is synthetic. The local database holds synthetic personas only. `docker compose down -v` wipes it.

## Revisit when

- Personal data is about to be stored in a production database. The DPO review (ADR-0001) must be done first, and the region must be confirmed.
- Scaleway Serverless SQL meets our needs and EU residency is confirmed, which would reopen Option C.
- The hand-written SQL becomes hard to review, which would reopen Option B.
- A PostgreSQL major version is due for upgrade.
