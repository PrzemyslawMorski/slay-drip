# Discovery: identity provider for user accounts (F02)

**Date:** 2026-10-15
**Author:** Claude Code, drafted for Przemysław Morski
**Status:** Concluded
**Outcome:** Option A chosen (self-hosted Keycloak on Scaleway). Recorded in [ADR-0001](../adr/0001-self-hosted-keycloak-identity-provider.md). Linked from [F02](../specs/F02-auth-and-user-scoped-data.md).

## Problem

F02 needs user accounts before any user-scoped endpoint, consent record or export can exist. Scaleway has no managed user directory, so an identity provider (IdP) must be chosen. CLAUDE.md lists this as an open decision and says not to decide it in code. It blocks F03, F04, F09, S1-01 and S7-01, so it is on the critical path for Session 1.

The IdP has to meet the hard rules: EU-only processing with a DPA that gives zero retention and no training on user data, 18+ enforced at sign-up, granular consent stored per user, and no new vendor without an ADR (see [security.md](../security.md) §4 and §5).

## Questions

1. Which candidates can run with EU-only data processing, and where does each one actually host user data?
2. Can a self-hosted option run on Scaleway Serverless Containers with the Serverless SQL Database, within the existing Terraform and container-secret setup?
3. Does a managed option need a new vendor DPA, and does its parent company create extra legal exposure (for example, US-law access)?
4. What does each option cost in operational effort for a small team?

## Method

Desk research on 2026-10-15, using web search on vendor pages, vendor community forums and third-party listings. No option was installed or tested, so nothing here is a benchmark. Claims from forum posts and third-party sites are marked **unverified**. Before any decision, each must be checked against the vendor's own documentation or contract.

## Findings

### Q1: Where does each candidate host user data?

- **Zitadel Cloud (managed).** Its help centre lists EU as one of four data locations, chosen when an instance is created. It says it cannot guarantee data stays in the region in transit. Its GDPR page says it is headquartered in Switzerland, which the European Commission recognises as adequate, and it lists sub-processors in a Trust Center. Sources: [Zitadel Cloud](https://zitadel.com/zitadel-cloud), [GDPR page](https://zitadel.com/gdpr), [data location help](https://help.zitadel.com/where-is-zitadel-cloud-data-stored).
  - Unverified: a European Alternatives listing says Zitadel runs on Google Cloud Platform. This is older and needs checking. Source: [european-alternatives.eu](https://european-alternatives.eu/de/produkt/zitadel).
- **Ory Network (managed).** Since the self-service region change, paid plans can pick US East, US West or EU Central. Personal data is homed to the chosen region. Ory's multi-region page lists GDPR and ISO 27001 coverage. Sources: [changelog](https://changelog.ory.com/announcements/ann_zkW40qXG910Ke), [personal data location](https://ory.sh/docs/security-compliance/personal-data-location), [multi-region](https://www.ory.sh/multi-region/).
  - Unverified: the EU Central hosting is described as Google Cloud in Frankfurt, from older community answers. EU pricing was not found.
- **Auth0 (managed, Okta).** An EU tenant keeps user data in the chosen region, except aggregate telemetry, which is stored in the EU. Staff say EU tenants are almost always on AWS, primary in Frankfurt with failover in Dublin. Sources: [community: data location](https://community.auth0.com/t/customer-data-locations/104690), [community: countries stored](https://community.auth0.com/t/countries-auth0-stores-data-in/70319).
  - Observed: Auth0 runs on AWS. CLAUDE.md retires AWS for our own stack. This is a vendor-side hosting choice and not a service we configure, but it must be acknowledged in the ADR and the vendor DPA.
  - Observed: Auth0 is a US-headquartered company. Support may process data from other locations. Its EU residency does not remove US-law access exposure, which the DPO should assess.
- **Keycloak (self-hosted, Apache 2.0).** It runs on Quarkus. Container listings for 26.5.x and 26.6.x show an Apache-2.0 licence. No vendor sees our data, so no new DPA is needed. Source: [Keycloak image listing](https://git.hamburg.ccc.de/CCCHH/-/packages/container/oci-images%2Fkeycloak/26.6.1).
  - Unverified: that the legacy WildFly distribution was retired in version 25 (sources disagree on version 20 or 25).
  - Unverified: health endpoints, metrics configuration and hardware sizing. The search returned no official guidance. Check the official server documentation during the spike.

### Q2: Can a self-hosted option run on our platform?

- Inferred: Keycloak needs a PostgreSQL database. Scaleway's Serverless SQL Database is PostgreSQL-compatible, so it is a plausible fit. The database would be separate from the app's database.
- Inferred: Keycloak is stateful for sessions and expects a fixed admin setup. Scale-to-zero on Serverless Containers may cause cold starts and session loss. A spike must test this. It is the main technical risk.
- Inferred: a self-hosted IdP also needs email (verification and reset). Email must go through an EU sender, and that sender becomes a new vendor with an ADR.
- Not verified: Scaleway Serverless Containers' limits (memory, startup time, minimum instances). Check against Scaleway's docs during the spike.

### Q3: Does a managed option need a new vendor DPA?

- Yes, for Zitadel Cloud, Ory Network and Auth0. Each needs a DPA with zero retention and no training on data, recorded in an ADR (security.md §4).
- Self-hosted Keycloak needs no processor DPA for the IdP itself. Email delivery still does.

### Q4: Operational effort

- Managed options remove patching, upgrades, backups and scaling of the IdP. This matters for a workshop team with limited ops capacity.
- Self-hosted Keycloak means we own upgrades, backups, secrets rotation and availability. The cost is ongoing ops time, not a licence fee.

## Options

| Option | Fit with requirements | Cost / effort | Risk | Notes |
| --- | --- | --- | --- | --- |
| **A. Keycloak self-hosted on Scaleway** | Strong. All data stays on Scaleway `fr-par`. No new processor for the IdP. Apache 2.0. | Medium: we run it, back it up and upgrade it. Needs a spike. | Serverless container fit (cold start, sessions) unproven. Ops burden. | Best match to "Scaleway-only" and "no new vendor" rules. |
| **B. Zitadel Cloud, EU instance** | Good. EU data location, Swiss HQ, ISO 27001 and SOC 2 claimed. | Low ops. Vendor cost not found. | New processor, DPA needed. Hosting provider unclear (GCP per one source). | Needs confirmation of hosting and sub-processors. |
| **C. Ory Network, EU Central** | Good. Regional homing and GDPR listed. | Low ops. EU pricing not found. | New processor, DPA needed. Hosting provider unclear (Google Cloud, Frankfurt per old sources). | Ask Ory for EU pricing and a DPA. |
| **D. Auth0, EU tenant** | Acceptable on paper. EU data residency. | Low ops. Pricing not checked. | US parent, AWS-hosted, support access from other locations. Adds a US-law assessment for the DPO. | Least aligned with the Scaleway and EU-first rules. |
| **E. Build our own auth** | Poor. Password and session security would be ours to get right. | High. | High (security risk). | Rejected. Not considered further. |

## Recommendation

**Lean toward option A (self-hosted Keycloak on Scaleway), but do not decide yet.** CLAUDE.md reserves this choice for the owner. The lean rests on three points:

1. It keeps every byte of user identity data on Scaleway `fr-par`, which matches the hosting rule most directly.
2. It adds no processor DPA for the IdP, which is the slowest part of onboarding a vendor.
3. It is Apache 2.0 licensed, so there is no licence-cost surprise.

Before committing, run a **time-boxed spike (about 2 days)** to answer:

- Does Keycloak start, stay up and keep sessions on a Scaleway Serverless Container with minimum-instance settings? Record cold-start time and memory use.
- Does it connect to a Scaleway Serverless SQL Database through the container's secret environment, with no secret in the repo?
- Can it store the 18+ confirmation and consent records as user attributes, or do they need the app database?
- What does the Terraform for it look like, and does it fit the existing `terraform/` setup?

If the spike fails on the container fit, the fallback is **option B or C**, with an ADR and a DPA review. **Do not pick D** unless the DPO accepts the US-law and AWS exposure.

**Explicitly not doing:**

- Not choosing a provider in code or Terraform before the ADR is accepted.
- Not building our own authentication (option E).
- Not adding any email, IdP or analytics vendor before its DPA and ADR are in place.

## Open questions

Things this discovery could not answer, and who could:

- **Owner (Przemysław / product owner):** pick option A, B or C, or ask for the spike first. Hard to reverse, so an ADR is required.
- **Vendor (Zitadel, Ory):** current hosting provider for the EU region, sub-processors, EU pricing, and DPA terms.
- **DPO:** whether US-parent vendors (Auth0, and possibly Zitadel and Ory) need a transfer or access assessment, and whether age is stored at all (security.md open decisions).
- **Scaleway:** Serverless Containers limits for a stateful IdP, and whether Serverless SQL needs a separate instance for it.
- **Email:** which EU transactional email sender to use for verification and password reset.
