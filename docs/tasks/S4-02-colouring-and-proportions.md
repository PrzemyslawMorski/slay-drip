---
id: S4-02
title: Colouring and proportions from photo or measurements
slice: Session 4 – Profile
priority: P0
status: todo
depends_on: [S4-01, F04, F10]
---

# S4-02 · Colouring and proportions from photo or measurements

**Slice:** Session 4 – Profile · **Priority:** P0 · **Status:** todo
**Depends on:** [S4-01](S4-01-style-profile-and-constraints.md), [F04](F04-image-storage-s3.md), [F10](F10-spike-eu-model-selection.md)
**Requirements:** F1.2; F1.3; Privacy 3, 7 (see [requirements](../requirements.md))

## Context

Not started.

## Scope

- Optional body-photo analysis → derived attributes (undertone, hair/eye contrast, colour season, proportion descriptors).
- Keep derived attributes only; delete raw photo unless the user opts into retention.
- No face recognition or identification; optional face blur on stored photos.
- Measurements path with metric/imperial units, clearly labelled as lower quality.

## Acceptance criteria

- [ ] Profiles exist for every golden persona via both paths.
- [ ] Raw photo is deleted by default after analysis (test).
