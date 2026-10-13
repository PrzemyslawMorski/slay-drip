---
id: S2-02
title: AI auto-tagging with editable tags
slice: Session 2 – Capture + tagging
priority: P0
status: todo
depends_on: [S2-01, F10, F09]
---

# S2-02 · AI auto-tagging with editable tags

**Slice:** Session 2 – Capture + tagging · **Priority:** P0 · **Status:** todo
**Depends on:** [S2-01](S2-01-single-item-camera-capture.md), [F10](F10-spike-eu-model-selection.md), [F09](F09-ai-cost-tracking.md)
**Requirements:** F2.3; NFR: tagging runs in background (see [requirements](../requirements.md))

## Context

All tags are entered by hand today.

## Scope

- Async tagging job (upload event → Scaleway queue → serverless container worker) calling the chosen vision model with structured output: category, colours, pattern, material, formality, season, fit.
- Store tag source (`ai`/`user`) and confidence; UI shows tags as editable chips.
- User edits are never overwritten by re-tagging.

## Acceptance criteria

- [ ] Item gets tags in the background without blocking the UI.
- [ ] Every tag is editable and the edit persists.
