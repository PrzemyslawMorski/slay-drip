---
id: S5-06
title: Outfit quality eval with LLM judge and fairness check
slice: Session 5 – Recommendation
priority: P0
status: todo
depends_on: [F08, S5-03]
---

# S5-06 · Outfit quality eval with LLM judge and fairness check

**Slice:** Session 5 – Recommendation · **Priority:** P0 · **Status:** todo
**Depends on:** [F08](F08-eval-harness-and-golden-set.md), [S5-03](S5-03-recommendation-engine.md)
**Requirements:** AI quality: rubric + LLM judge, hard constraints, fairness (see [requirements](../requirements.md))

## Context

Not started.

## Scope

- Rubric: coherence, occasion fit, colour harmony, rationale honesty.
- LLM judge plus a spot human-review sample.
- Constraint checker over all outputs.
- Scores broken down by body type and skin tone.

## Acceptance criteria

- [ ] Eval report shows comparable scores across persona groups, or a logged issue for each gap.
