---
id: F08
title: Eval harness and golden-set scaffold
slice: Foundation (before Session 2)
priority: P0
status: todo
depends_on: []
---

# F08 · Eval harness and golden-set scaffold

**Slice:** Foundation (before Session 2) · **Priority:** P0 · **Status:** todo
**Depends on:** —
**Requirements:** AI quality: golden set, per-attribute accuracy, hard constraints, LLM judge, tone, fairness (see [requirements](../requirements.md))

## Context

Requirements say evaluation is built alongside every slice. There is no eval code or dataset.

## Scope

- Create `evals/` with a runner that can be invoked locally and in CI.
- Golden-set structure: synthetic personas (menswear/womenswear, petite/tall/plus, range of skin tones, modest and adaptive constraints) and hand-labelled items. Record licence for every image.
- Report format: per-attribute accuracy, constraint violations, rubric scores, broken down by persona attributes (for fairness).
- CI job that runs the cheap evals on every PR and the expensive ones on demand.

## Acceptance criteria

- [ ] `evals` runs end to end on a stub model and produces a report.
- [ ] Golden-set manifest includes licence/source per asset.
