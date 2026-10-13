---
id: S7-04
title: DPIA inputs and data inventory
slice: Session 7 – Trust hardening
priority: P0
status: todo
depends_on: [S7-01, S7-02]
---

# S7-04 · DPIA inputs and data inventory

**Slice:** Session 7 – Trust hardening · **Priority:** P0 · **Status:** todo
**Depends on:** [S7-01](S7-01-export-and-delete-all.md), [S7-02](S7-02-retention-toggles-and-consent-revocation.md)
**Requirements:** Privacy 1; GDPR Art. 9 note; Open question: DPO review (see [requirements](../requirements.md))

## Context

A DPIA is required before any real user data is collected.

## Scope

- Data inventory: every field, store, region, retention and processor.
- Vendor DPA list (zero retention, no training).
- Hand to DPO for the special-category question.

## Acceptance criteria

- [ ] `docs/dpia-inputs.md` reviewed by DPO.
