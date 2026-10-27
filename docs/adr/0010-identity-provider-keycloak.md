# ADR-0010: Self-hosted Keycloak on Scaleway as the identity provider

**Status:** Accepted
**Date:** 2026-10-27
**Deciders:** Outfit Planner team (decision taken by Przemysław Morski; product owner and DPO to confirm)
**Related:** [requirements](../requirements.md) (F02, Privacy, GDPR & trust), [security guide](../security.md) (sections 2, 5, 14, and the open-decision note at the top of the user-scoped endpoints section), [ADR-0001](0001-eu-hosting-18plus-gate-gdpr-baseline.md) (hosting direction and F02 follow-up), [ADR-0005](0005-local-cloud-emulation.md) and [ADR-0006](0006-development-feedback-loops-ports-and-fakes.md) (local stand-ins and ports), [ADR-0008](0008-postgresql-data-store-and-migrations.md) (PostgreSQL), [CLAUDE.md](../../CLAUDE.md) (platform decisions, open decisions)

## Context

F02 needs user accounts. Scaleway has no managed user directory (ADR-0001), so the identity provider is a separate decision, and CLAUDE.md lists it as open. Until it is decided, [security guide](../security.md) says no user-scoped endpoint ships.

The constraints that shape the choice:

- Scaleway only, in `fr-par`, `nl-ams` or `pl-waw`. AWS is out (CLAUDE.md, ADR-0001). AWS Cognito is therefore not an option without a superseding ADR.
- ADR-0001 direction from the product owner: a self-hosted identity provider, deployed on Scaleway serverless infrastructure in an allowed EU region, not a Scaleway managed service.
- The PWA signs users in with OIDC. The Go API takes user identity only from the verified token (BE-41 in the backend ruleset), so the provider must issue standard tokens that the API can check against a JWKS.
- Local run is first class (ADR-0005). The provider must run in `compose.yaml` with the same config keys as production, using the same engine where possible (ADR-0006).
- A Keycloak setup was tried and discarded on 2026-10-15 ([workshop takeaways](../workshop-takeaways.md)). Its reasons are not recorded in the repo, so the spike below has to address them.

## Decision

We will run Keycloak, an open-source identity provider under the Apache License 2.0, self-hosted on Scaleway serverless containers in `fr-par` (default region). The PWA uses OIDC authorization code with PKCE as a public client. The Go API validates access tokens against the realm's JWKS. The identity provider stores only the minimum account data: subject ID, email and credentials. All other personal data stays in our PostgreSQL database.

## Options considered

### Option A: Keycloak self-hosted on Scaleway (chosen)

- Pros: open source, no licence fee, no vendor holds the data, so no vendor DPA beyond Scaleway's. Standard OIDC and JWKS. Mature, widely documented. Runs as the same software locally and in production (ADR-0006). Realm config can be kept as code.
- Cons: we operate it. Patching, upgrades (roughly one major release a year), backups and restore tests, TLS, and admin access are ours. Clustering and cache behaviour need checking on serverless containers (see Consequences).

### Option B: Zitadel self-hosted on Scaleway (not chosen)

- Pros: Go codebase, lighter to run than Keycloak, open source.
- Cons: smaller ecosystem and fewer operating references for this team. Licence and EU-only operation not yet verified. Kept as the fallback if the Keycloak spike below fails.

### Option C: AWS Cognito, eu-central-1 (rejected)

- Pros: managed, low operations, passkeys available, EU region.
- Cons: AWS is out of scope for this product (ADR-0001, option B). Adds a second cloud, a second set of IAM and DPA reviews, and needs a mock that ADR-0005 does not provide. Choosing it would need a superseding ADR for the platform decision.

### Option D: EU-hosted managed SaaS (Auth0, Zitadel Cloud, Ory Network) (rejected for now)

- Pros: low operations. Some offer passkeys and EU residency.
- Cons: a third-party processor holds account data, so it needs a DPA with zero retention and no training. Residency and sub-processors were not verified. Each one is a new vendor under ADR-0001's allow-list rule. Revisit if the operating burden of Option A proves too high.

## Consequences

- Positive: all account data stays on Scaleway in an EU region. Standard OIDC keeps the Go API independent of the provider. The same engine runs locally and in production. The provider can be swapped later behind the identity port (ADR-0006).
- Negative: we run an identity service, which is a security-sensitive system. Someone must own patching, backups and on-call. Keycloak's clustering uses a distributed cache, and serverless containers may not support it cleanly, so the deployment target needs verifying before this ADR is relied on.
- Follow-up work (link specs or tasks):
  - **Spike (gate before first user endpoint):** deploy Keycloak on Scaleway serverless containers in `fr-par` with two instances and a shared PostgreSQL. Confirm that sessions survive an instance restart and that the JWKS endpoint is reachable from the API. If this fails, record that in a new ADR that amends the deployment target (Scaleway Instances behind a load balancer is the fallback), or switch to Option B.
  - Local service: add Keycloak to `compose.yaml` with a realm import in `infra/dev/`, using the same issuer and JWKS config keys as production. Local realm users are synthetic.
  - Account deletion: the app deletes its data in one transaction, then calls the Keycloak Admin API with a least-privilege service client to delete the user and revoke sessions.
  - Session 1 walking skeleton: sign-up with the 18+ gate and consent (ADR-0001), using this provider.
  - Confirm Scaleway's DPA, sub-processors and encryption defaults for the managed PostgreSQL and container registry (security guide, section 13).

## Compliance check

- [x] EU-only processing (Scaleway `fr-par` by default; `nl-ams` or `pl-waw` allowed). No third-party identity vendor. Scaleway DPA and sub-processor list still to be confirmed before launch.
- [x] Consent and retention impact (granular, revocable). Consent records live in our database, not in the identity provider. Deletion goes through the app, then the provider (see follow-up). Erasure in backups follows the window in the security guide, section 14.
- [x] Special-category data impact (modesty and adaptive fields). Not stored in the identity provider. DPO review still open.
- [x] Hard constraints remain hard filters. Not affected by this decision.
- [x] Test data is synthetic. Local realm users are synthetic personas only.

## Open items (not decided here)

- Passkeys or magic links for the MVP, or email and password for the pilot. Not decided.
- Scaleway region: `fr-par` is the default, not a confirmed choice.
- Backup erasure window (security guide, section 14). Not decided.
- Owner and on-call for the identity service, and whether a second admin is needed. Not decided.

## Revisit when

- The spike shows that serverless containers cannot run the Keycloak cluster reliably. Amend the deployment target.
- Operating the identity service takes more effort than the team can sustain. Consider Option B or Option D, with a new ADR.
- The platform decision changes (for example, to allow AWS). Cognito would then need its own ADR.
- DPO review of the special-category fields or the age-check method changes what the provider may hold.
