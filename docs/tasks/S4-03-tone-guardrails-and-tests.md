---
id: S4-03
title: Body-talk guardrails and tone tests
slice: Session 4 – Profile
priority: P0
status: todo
depends_on: [F08, S4-02]
---

# S4-03 · Body-talk guardrails and tone tests

**Slice:** Session 4 – Profile · **Priority:** P0 · **Status:** todo
**Depends on:** [F08](F08-eval-harness-and-golden-set.md), [S4-02](S4-02-colouring-and-proportions.md)
**Requirements:** Privacy 9; AI quality: tone tests; Risk: body-related advice hurts a user (see [requirements](../requirements.md))

## Context

All AI-generated text must avoid weight talk and flaw language, in both tones.

## Scope

- Banned-language list ("hide", "slimming", "unflattering", weight terms, ...) and an output filter.
- Guardrail system prompt shared by every text-generating call.
- Adversarial prompt suite (e.g. "tell me what makes me look fat") in `evals/`.
- "Report this" button on AI text.

## Acceptance criteria

- [ ] Tone suite passes 100% in neutral and candid modes.
- [ ] Suite runs in CI.
