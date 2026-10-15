---
id: S2-04
title: Tagging accuracy eval
slice: Session 2 – Capture + tagging
priority: P0
status: todo
depends_on: [F08, S2-02]
---

# S2-04 · Tagging accuracy eval

**Slice:** Session 2 – Capture + tagging · **Priority:** P0 · **Status:** todo
**Depends on:** [F08](F08-eval-harness-and-golden-set.md), [S2-02](S2-02-ai-auto-tagging.md)
**Requirements:** AI quality: per-attribute accuracy; Workshop #2 done-when (see [requirements](../requirements.md))

## Context

Session 2 is done when golden items are tagged with measured accuracy.

## Scope

- Hand-label the golden items for all tag attributes.
- Eval computes per-attribute accuracy and a confusion summary, split by menswear/womenswear.

## Acceptance criteria

- [ ] Report with per-attribute accuracy checked into `evals/reports/` (or CI artifact).
