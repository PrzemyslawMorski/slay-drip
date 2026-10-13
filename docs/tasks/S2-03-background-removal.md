---
id: S2-03
title: Background removal for flat-lay images
slice: Session 2 – Capture + tagging
priority: P1
status: todo
depends_on: [S2-01, F10]
---

# S2-03 · Background removal for flat-lay images

**Slice:** Session 2 – Capture + tagging · **Priority:** P1 · **Status:** todo
**Depends on:** [S2-01](S2-01-single-item-camera-capture.md), [F10](F10-spike-eu-model-selection.md)
**Requirements:** F2.5 (see [requirements](../requirements.md))

## Context

No image processing beyond compression.

## Scope

- Produce a transparent cut-out derivative per item (EU-hosted model or library).
- Store as a second S3 object; fall back to the original on failure.

## Acceptance criteria

- [ ] Cut-outs exist for golden items; failures fall back gracefully.
