---
id: F10
title: Spike: EU-hosted model selection
slice: Foundation (before Session 2)
priority: P0
status: todo
depends_on: [F08]
---

# F10 · Spike: EU-hosted model selection

**Slice:** Foundation (before Session 2) · **Priority:** P0 · **Status:** todo
**Depends on:** [F08](F08-eval-harness-and-golden-set.md)
**Requirements:** Open question: which EU-hosted model(s) meet the vision quality bar; Privacy 2 (see [requirements](../requirements.md))

## Context

No AI provider is integrated. Vision, segmentation and text models must run in the EU under a DPA with zero retention and no training.

## Scope

- Shortlist EU-region options (e.g. Amazon Bedrock in `eu-central-1`/EU cross-region profiles, Azure OpenAI EU, Vertex AI EU, self-hosted).
- Run tagging and segmentation on a small golden subset; compare accuracy, latency, cost.
- Confirm DPA, data residency and retention terms per vendor.
- Write an ADR in `docs/adr/`.

## Acceptance criteria

- [ ] ADR merged with chosen model(s) per task (tagging, segmentation, background removal, recommendation, judge).
- [ ] Measured numbers attached.
