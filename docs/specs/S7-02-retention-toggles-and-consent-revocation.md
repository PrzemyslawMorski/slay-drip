---
id: S7-02
title: Photo retention toggles and consent revocation
slice: Session 7 – Trust hardening
priority: P0
status: todo
depends_on: [S1-01, F04]
---

# S7-02 · Photo retention toggles and consent revocation

**Slice:** Session 7 – Trust hardening · **Priority:** P0 · **Status:** todo
**Depends on:** [S1-01](S1-01-age-gate-and-consent.md), [F04](F04-image-storage-s3.md)
**Requirements:** F6.2; Privacy 3, 4 (see [requirements](../requirements.md))

## Context

Not started.

## Scope

- Toggle raw photo retention; delete any single photo.
- Revoking a consent deletes the data of that type (e.g. revoke body photo → delete raw photo and derived colouring if required).

## Acceptance criteria

- [ ] Each consent revocation has a test proving the data is gone.
