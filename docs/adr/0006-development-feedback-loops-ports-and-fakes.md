# ADR-0006: Three development feedback loops, with ports and fakes for cloud calls

**Status:** Accepted
**Date:** 2026-10-21
**Deciders:** Outfit Planner team (product owner to confirm)
**Related:** [ADR-0005](0005-local-cloud-emulation.md) (local cloud emulation), [local development guide](../local-development.md), [CLAUDE.md](../../CLAUDE.md) (Working in this repo, Quality bar for AI features), [security guide](../security.md) (section 13)

## Context

ADR-0005 decided to run local stand-ins for Scaleway services. It did not decide how day-to-day development uses them. Three forces pull in different directions:

- **Speed.** Developers need feedback in seconds for most changes. Starting a full local stack for every change is too slow, and running cloud calls in tests makes them slow and flaky.
- **Fidelity.** Some behaviour only shows up against real engines and real Scaleway services: SQL behaviour, Keycloak token flows, IAM and bucket policies, model latency and output quality. Fakes alone cannot prove these.
- **Hard constraints.** Availability, weather, modesty and adaptive constraints must hold 100% of the time (CLAUDE.md). Their tests must run on every change, not only in the cloud.

Emulation fidelity also varies by service. Keycloak and PostgreSQL run as the same software locally and on Scaleway. S3 has a protocol stand-in with gaps in policy and lifecycle behaviour. Scaleway Serverless Functions have no local emulator. AI inference has no local equivalent, and CLAUDE.md's latency and quality targets are only meaningful on the real endpoint. No single emulator covers all of this, so the approach must allow a different fidelity for each service.

## Decision

We will organise development around **three feedback loops**, and put every cloud call behind a **port** so that each loop can use a different adapter.

**Loops:**

1. **Inner loop (seconds, every change).** Unit and domain tests run against in-memory **fakes** of each port: storage, identity, inference, queue, functions. No Docker, no network. All hard-constraint tests (availability, weather, modesty, adaptive) must run here, so they are checked on every change.
2. **Integration loop (tens of seconds, before a PR is opened).** `docker compose up` starts the real engines the stack uses (PostgreSQL first, then Keycloak once F02 is decided, and the S3 stand-in from ADR-0005). The app runs against them through the real adapters.
3. **Cloud loop (minutes, on PR merge and nightly).** A **shared Scaleway dev project** in an allowed EU region runs the same integration suite against real services, plus IAM and policy checks, model latency and output-quality evals.

**Ports and adapters:**

- Each external capability is a port: an interface the domain depends on, with no vendor types in it. Initial ports: object storage, identity, AI inference, queue and background jobs, and functions or workers.
- Every port has a **fake** adapter (in-memory, deterministic) for the inner loop, a **local** adapter for the integration loop where a local engine exists, and a **Scaleway** adapter for the cloud loop.
- A **contract test suite** per port runs against the fake and the real adapter. It fails if the fake drifts from the real service's behaviour. Contract tests run in the integration loop and the cloud loop, not in the inner loop.

**Rules:**

- AI inference is never called in the inner loop. Responses are **recorded once** and replayed from fixtures. Fixtures are synthetic and contain no real personal data. Live model calls run only in the cloud loop and in quality evals.
- One shared Scaleway dev project per environment, with per-developer name prefixes. Not one project per developer.
- A hard-constraint test may not be skipped or marked "cloud only". If a constraint can only be verified with a real service, the fake must still encode the constraint, and the cloud loop checks the real service.
- Each loop has one command. The commands are documented in `docs/local-development.md`. Keep them to one line each.

## Options considered

### Option A: Full local emulation for everything (rejected)

- Pros: one loop, no cloud dependency for most work.
- Cons: fidelity gaps for AI, functions and managed services. Maintaining emulators costs more than the product code. Slow to start. Misses the latency and quality targets.

### Option B: Cloud-only development (rejected)

- Pros: exact fidelity, no local tooling.
- Cons: slow feedback, needs network and a cloud project for every change, costs money per run, and makes tests flaky and shared-state heavy. Fails the first-class local run requirement.

### Option C: Fakes plus a shared cloud dev project, with local engines only when needed (chosen)

- Pros: fast inner loop. Real engines catch SQL and auth mistakes early. Cloud checks are limited to what only the cloud can verify. Ports keep vendor choices reversible.
- Cons: fakes can drift, which the contract tests mitigate. Port design costs a little at the start. A shared dev project needs cleanup and naming discipline.

### Option D: Per-developer Scaleway projects (rejected for now)

- Pros: isolation between developers.
- Cons: setup time, cost, and more IAM to manage. Revisit if shared state causes repeated conflicts.

## Consequences

- Positive: most changes get feedback in seconds. Hard-constraint tests run on every change. Vendor choices stay reversible behind ports. AI cost and latency are measured only where they are real.
- Negative: ports and fakes add upfront design work. Contract tests must be maintained for each port. The shared dev project needs clear ownership and periodic cleanup.
- Follow-up work:
  - Stack ADR: done in [ADR-0007](0007-backend-go-and-test-stack.md) (Go, standard `testing`, `testify`, hand-written fakes).
  - Write the port list and the contract test template into `docs/local-development.md` once the first port exists.
  - Add PostgreSQL to `compose.yaml` as the first integration-loop engine.
  - Create the shared Scaleway dev project in `fr-par`, with ownership and a cleanup rule.
  - AI: decide the fixture-recording process and the quality eval set, with synthetic personas only.

## Compliance check

- [x] EU-only processing. The shared dev project and any fixture-recording calls run only in `fr-par`, `nl-ams` or `pl-waw`. Fakes and local adapters hold no personal data.
- [x] Consent and retention impact (granular, revocable). Not applicable to fakes or local engines, which hold synthetic data only. The shared dev project holds synthetic data only, so its cleanup rule is a data-retention control.
- [x] Special-category data impact (modesty and adaptive fields). Synthetic personas only. Recorded fixtures must not include real user data.
- [x] Hard constraints remain hard filters. Hard-constraint tests run in the inner loop, and a fake may not weaken a constraint.
- [x] Test data is synthetic. Recorded model responses are reviewed to confirm they contain only synthetic inputs.

## Revisit when

- A port needs behaviour that neither its fake nor its local adapter can reproduce, and contract tests cannot catch the gap.
- The shared Scaleway dev project causes repeated conflicts or cost overruns, which would make per-developer projects worth revisiting.
- Model fixtures drift from the live model enough to hide quality regressions.
- The stack ADR changes the test framework or the port conventions.
