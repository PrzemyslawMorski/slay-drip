# F11 · Spike: Keycloak on Scaleway Serverless Containers

| Field | Value |
| --- | --- |
| **Key** | F11 |
| **Issue type** | Spike |
| **Priority** | High (P0 for the Foundation slice: it gates F02) |
| **Status** | In progress (Terraform drafted; live deployment blocked on Scaleway access) |
| **Epic** | Foundation (Session 1) |
| **Components** | infra, backend |
| **Labels** | auth, spike, gdpr |
| **Story points** | — (time-boxed: 2 days) |
| **Sprint / Fix version** | Foundation (Session 1) |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

[ADR-0001](../adr/0001-self-hosted-keycloak-identity-provider.md) chose self-hosted Keycloak on Scaleway as the identity provider for F02. The main unverified risk is whether Keycloak, which is stateful for sessions, runs reliably on Scaleway Serverless Containers backed by the Serverless SQL Database. This spike tests that before any F02 implementation starts. Background is in the [discovery note](../discovery/2026-10-15-identity-provider.md).

**Scope**

- Deploy a pinned Keycloak 26.x image on a Scaleway Serverless Container in `fr-par`, using a Serverless SQL Database for its own schema.
- Compare minimum-scale 0 and 1, and record cold-start time, memory use and session behaviour when an instance is replaced.
- Create a realm with user attributes for granular consent flags (ADR-0001 decision: attributes, not app-database rows).
- Confirm secrets (database URL, admin credentials) come from the container's secret environment, not the repo.
- Draft the Terraform for the Keycloak container and database and run `terraform plan`. Do not apply it outside the spike environment.
- Write a go / no-go note and update ADR-0001's status or follow-up accordingly.

**Out of scope**

- The application's sign-up, sign-in and token handling (F02).
- Transactional email (its own vendor ADR).
- Any 18+ age data. Per ADR-0001, age is not stored for now.

## Acceptance criteria

- [ ] Given the spike environment, when Keycloak is deployed to `fr-par`, then the admin console and OpenID discovery endpoint respond over HTTPS.
- [ ] Given minimum-scale 0, when the service is idle and then receives a sign-in, then cold-start time is recorded in the note.
- [ ] Given a running session, when the container instance is replaced, then the note states whether the session survives, and what the client must do.
- [ ] Given a synthetic persona, when it signs up, then consent flags are stored as Keycloak user attributes and can be read back by the API.
- [ ] No age, date of birth or special-category field (modesty or adaptive needs) is stored in Keycloak.
- [ ] The database URL and admin credentials are not present in the repo, logs or Terraform state committed to git.
- [ ] `terraform plan` runs cleanly against the spike environment, with no AWS resources or non-EU regions.
- [ ] The go / no-go note is written in this file, and ADR-0001 is updated: kept (Accepted) on go, or superseded on no-go.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| blocks | [F02](F02-auth-and-user-scoped-data.md) | To Do | F02 cannot start until the IdP is proven to run on our platform |
| relates to | [ADR-0001](../adr/0001-self-hosted-keycloak-identity-provider.md) | Accepted | The decision this spike tests |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR (Terraform and any helper scripts), with `terraform plan` output attached.
- [ ] Tests added or updated where the spike produces code (no `.env` files, no secrets in the diff).
- [ ] Quality and compliance checked: EU-only region, synthetic data only, consent stored per type.
- [ ] Accessibility: not applicable (no UI).
- [ ] Docs updated: go / no-go note in this file, ADR-0001 status, and [docs/specs/README.md](README.md).

## Test plan

- Manual: deploy to `fr-par`, sign in with a synthetic persona from a browser, restart the instance, repeat sign-in.
- Measured: cold-start time, memory use, and session behaviour at minimum-scale 0 and 1.
- Automated: `terraform validate` and `terraform plan` in CI; no unit tests required for a spike.

## Notes

**Time-box:** two days. If the container cannot run Keycloak reliably inside that window, stop and report the blocker. Do not extend the spike silently.

**Go / no-go:** pending. No live measurements exist yet, so neither go nor no-go can be recorded.

**Spike log**

- 2026-10-15: Drafted Keycloak Terraform in `terraform/keycloak.tf`, with variables in `terraform/variables.tf`. It adds a separate Serverless SQL Database, a Serverless Containers namespace and a container. Secrets come in as `sensitive` variables (`TF_VAR_keycloak_*`) and go to `secret_environment_variables`. `terraform fmt` and `terraform validate` pass (`init -backend=false`, no credentials).
- Provider check: the Scaleway provider (2.86.0 in the local cache) accepts `command` and `args` on `scaleway_container`, and `registry_image` is deprecated in favour of `image`. The draft uses `image` and `args = ["start"]`. The first real deploy must confirm that `start` reaches `kc.sh`.
- Not done, blocked on Scaleway credentials and a spike environment: `terraform plan`, deploy to `fr-par`, cold-start, memory and session measurements, synthetic sign-up, and attribute read-back. The remote state bucket (`slay-drip-tfstate`) and `TF_VAR_*` secrets are also needed. Nothing has been applied.
- Open for the deploy: `KC_HOSTNAME_STRICT=false` is for the spike only, and the hostname should be pinned before any real use. The Keycloak realm, user attributes and consent flags are not yet configured. Keycloak's health endpoint and sizing (1 vCPU, 1 GiB) are guesses to measure, not known values.

Requirements: Privacy 2, 4, 5 (see [requirements](../requirements.md)). Security guide: [security.md](../security.md) §4 and §5.
