# ADR-0001: Self-hosted Keycloak on Scaleway as the identity provider

**Status:** Accepted
**Date:** 2026-10-15
**Deciders:** Przemysław Morski (product owner decision, recorded by Claude Code)
**Related:** [F02](../specs/F02-auth-and-user-scoped-data.md), [discovery](../discovery/2026-10-15-identity-provider.md), [security guide](../security.md) §4, §5, [requirements](../requirements.md) F1.1 and Privacy 2, 8

## Context

All API routes are unauthenticated and user data has no owner (F02). Scaleway has no managed user directory, so an identity provider (IdP) must be chosen. CLAUDE.md lists this as an open decision and requires that user data stay in EU regions (`fr-par`, `nl-ams`, `pl-waw`), with any vendor under a zero-retention, no-training DPA.

The IdP holds account identifiers and the 18+ confirmation, so it falls under the Personal data class in [security.md](../security.md) §1. It blocks F03, F04, F09, S1-01 and S7-01.

The discovery note compared Keycloak (self-hosted), Zitadel Cloud, Ory Network and Auth0. Managed options each add a processor, and each needs a DPA and an assessment. Auth0 is US-parented and AWS-hosted.

## Decision

We will run Keycloak (Apache 2.0) as a self-hosted identity provider on Scaleway, in `fr-par`, using a Scaleway Serverless SQL Database for its own data and Scaleway Serverless Containers for the server. Its configuration will come from Terraform and container secrets, following the existing `terraform/` and CI conventions.

Consent flags and the consent wording version are stored as Keycloak user attributes. Special-category fields (modesty and adaptive needs) are never stored in Keycloak. Age, including the date of birth and the 18+ result, is not stored for now. The 18+ check is still enforced server-side at sign-up.

Keycloak is not a processor of our data, so this adds no vendor DPA for the IdP. Transactional email for verification and reset will need its own EU sender and ADR.

## Options considered

### Option A: Keycloak self-hosted on Scaleway (chosen)

- Pros: all identity data stays in Scaleway `fr-par`; no new processor for the IdP; Apache 2.0; no licence cost.
- Cons: we own upgrades, backups, availability and secret rotation; Serverless Containers may not suit a stateful IdP (cold starts, sessions), which is unverified.

### Option B: Zitadel Cloud, EU instance

- Pros: EU data location; Swiss headquarters (adequacy); low ops.
- Cons: new processor and DPA; hosting provider unclear (one source says Google Cloud).

### Option C: Ory Network, EU Central

- Pros: regional data homing; GDPR coverage listed; low ops.
- Cons: new processor and DPA; hosting provider unclear; EU pricing not found.

### Option D: Auth0, EU tenant

- Pros: EU data residency for tenant data.
- Cons: US parent; AWS-hosted (conflicts with the Scaleway-only rule); support access from other locations; needs a US-law access assessment.

### Option E: Build our own authentication

- Pros: no vendor.
- Cons: we would own password storage, session security and recovery. Rejected as a security risk.

## Consequences

- Positive: user identity data never leaves Scaleway `fr-par`; no IdP DPA to negotiate; the setup stays within the Terraform and container-secret model.
- Negative: operational burden on the team; Keycloak's stateful behaviour on Serverless Containers is untested; upgrades must be planned.
- Follow-up work:
  - Spike [F11](../specs/F11-keycloak-serverless-spike.md) (two days): confirm that Keycloak starts, keeps sessions, and connects to Serverless SQL on a Scaleway Serverless Container with minimum-instance settings. Record cold-start time and memory. Confirm the Terraform shape. If the spike fails on container fit, supersede this ADR (fallback: Option B or C, with a DPA review). Do not silently change the choice.
  - Decide and record the transactional email sender (new vendor, needs its own ADR).
  - Update [F02](../specs/F02-auth-and-user-scoped-data.md) and [docs/specs/README.md](../specs/README.md) once the spike is done.
  - Confirm with the DPO whether not storing any 18+ result is acceptable. [security.md](../security.md) §2 asks for the minimum needed to show the check was passed, which may require a boolean. If so, revisit this ADR.

## Compliance check

- [x] EU-only processing: Keycloak and its database run on Scaleway `fr-par`. No vendor sees identity data. Email sender not yet chosen (see follow-up).
- [x] Consent and retention impact: consent flags and wording version are Keycloak user attributes, and revoking consent deletes the attribute and the data it gates. Account deletion (S7-01) must remove the Keycloak user as well as app data.
- [x] Special-category data impact: none in Keycloak. Modesty and adaptive-needs fields must not be stored in the IdP. They belong in the app's consent-gated store.
- [x] Age: no age or date of birth is stored. This is a temporary position pending DPO review (see follow-up).
- [x] Hard constraints remain hard filters: not applicable to this decision.
- [x] Test data is synthetic: spike and test accounts use synthetic personas only.

## Revisit when

- The spike shows Serverless Containers cannot run Keycloak reliably. Supersede with Option B or C.
- The operational cost of self-hosting exceeds the team's capacity (for example, repeated upgrade or availability incidents).
- The DPO requires storing age data or consent records in a separate store, which changes where IdP attributes can live.
- Scaleway changes its regions, or the EU-only rule changes.
