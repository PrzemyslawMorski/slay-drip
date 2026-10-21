# ADR-0001: EU-only hosting, 18+ gate and GDPR as the entry point to all functionality

**Status:** Accepted
**Date:** 2026-10-21
**Deciders:** Outfit Planner team (product owner and DPO to confirm)
**Related:** [requirements](../requirements.md) (Privacy, GDPR & trust; hard rules 2, 8), [security guide](../security.md) (sections 2, 4), [CLAUDE.md](../../CLAUDE.md) (Platform decisions, Hard rules)

## Context

Slay Drip processes personal data of adults in the EU: account identifiers, wardrobe photos, body measurements and photos, and possibly special-category data (modesty and adaptive-needs fields, GDPR Art. 9). The requirements make three conditions non-negotiable for every feature:

- 18+ only, enforced at sign-up.
- EU-only processing: all storage and AI inference in EU regions, with vendors under a zero-retention, no-training DPA.
- GDPR compliance: granular, revocable consent per data type, with deletion on revocation.

CLAUDE.md records the cloud provider as **Scaleway**, with regions `fr-par`, `nl-ams` or `pl-waw` (default `fr-par`). CLAUDE.md and the security guide state that AWS is not used. The identity provider (F02) and the DPO review of special-category fields are still open.

Because these conditions apply to every feature, they cannot be checked feature by feature. They have to be the first thing every request passes through.

## Decision

We will make EU-only hosting on Scaleway, the server-side 18+ gate and the GDPR consent model the entry point to all functionality. No feature, endpoint, store, queue or AI call is reachable unless it passes these three gates first.

- **Hosting:** all compute, storage, databases, queues, registries and AI inference run only in Scaleway `fr-par`, `nl-ams` or `pl-waw`. The API refuses to start outside that allow-list.
- **18+ gate:** enforced by the API at sign-up, using self-declaration for now. The user confirms they are 18+, and the API rejects the sign-up if they are not. A failed check creates no account and writes no personal data. The client check is for user experience only. No date of birth is stored.
- **GDPR:** every feature checks consent on the server before reading or writing a data type. Revoking consent deletes that data type. Special-category fields need their own explicit consent.

## Options considered

### Option A: Scaleway EU regions as the single entry point (chosen)

- Pros: matches CLAUDE.md and the security guide. One provider and one region allow-list to audit. Keeps data in the EU end to end.
- Cons: Scaleway has no managed user directory, so the identity provider needs a separate decision (F02). Some managed services available elsewhere may not exist on Scaleway.

### Option B: AWS EU regions (e.g. `eu-west-1`, `eu-central-1`) (rejected, out of scope)

- Pros: broad managed-service catalogue. EU regions exist.
- Cons: conflicts with the recorded platform decision in CLAUDE.md and the security guide, which retire the AWS stack. Adds a second cloud, a second set of IAM and DPA reviews, and more ways for data to leave the EU. AWS is never in scope for this product.

### Option C: Gates per feature instead of a shared entry point

- Pros: each feature can choose its own region and checks.
- Cons: easy to miss a check on one path. Hard to prove that no feature bypasses the 18+ gate or consent. Contrary to the "hard constraints are hard filters" rule.

## Consequences

- Positive: one place to verify EU residency, the age gate and consent. Tests can assert that unauthenticated or under-18 requests reach nothing else. Auditing is simpler for the DPO.
- Negative: every feature depends on the gate being built first, which pushes the 18+ and consent work into session 1 (walking skeleton). Scaleway's service set limits some choices.
- Follow-up work (link specs or tasks):
  - Session 1 walking skeleton: sign-up with 18+ gate and consent screens. Spec to be written in `docs/specs/`.
  - Identity provider (F02): decide in a separate ADR. Direction from the product owner: a self-hosted identity provider (not a Scaleway managed service) deployed on Scaleway serverless infrastructure in an allowed EU region.
  - DPO review of the special-category fields, and of the age-check method once self-declaration is reviewed.
  - Confirm Scaleway defaults meet encryption at rest and in transit (security guide, section 13).

## Compliance check

- [x] EU-only processing (Scaleway `fr-par`, `nl-ams` or `pl-waw`; vendors under zero-retention DPA). DPA status for each vendor still to be confirmed before launch.
- [x] Consent and retention impact (granular, revocable). Consent records and deletion path are part of the entry-point gate.
- [x] Special-category data impact (modesty and adaptive fields). Explicit consent assumed; DPO review open.
- [x] Hard constraints remain hard filters. The gate is a server-side check, not a model decision.
- [x] Test data is synthetic. Workshop personas only.

## Open items (not decided here)

- Age check method: self-declaration for now (product owner). A stronger verification step is not decided. Whether to store anything beyond the confirmation is for the DPO to review (security guide, section 2).
- Identity provider (F02): open, with the direction above.

## Revisit when

- The DPO asks for a stronger age check, or for a date of birth to be stored.
- The DPO decides on the special-category fields.
- Scaleway cannot provide a required service in an allowed EU region.
- The identity provider ADR is accepted, so the follow-up above can be closed.
