---
id: S2-01
title: Single-item camera capture
slice: Session 2 – Capture + tagging
priority: P0
status: todo
depends_on: [F03, F04, S1-01]
---

# S2-01 · Single-item camera capture

**Slice:** Session 2 – Capture + tagging · **Priority:** P0 · **Status:** todo
**Depends on:** [F03](F03-unify-item-model-and-wire-api.md), [F04](F04-image-storage-s3.md), [S1-01](S1-01-age-gate-and-consent.md)
**Requirements:** F2.2 (see [requirements](../requirements.md))

## Context

Upload accepts files only (drag-drop/file picker).

## Scope

- Camera capture (`<input capture>` or `getUserMedia`) with framing guidance.
- Keep the existing client-side compression.
- Upload to S3 and create the item in an `untagged` state.

## Acceptance criteria

- [ ] A user can photograph one item on iOS and Android and see it in the wardrobe.
