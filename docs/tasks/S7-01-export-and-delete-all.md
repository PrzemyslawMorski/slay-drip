---
id: S7-01
title: Export all data and delete account
slice: Session 7 – Trust hardening
priority: P0
status: todo
depends_on: [F02, F04]
---

# S7-01 · Export all data and delete account

**Slice:** Session 7 – Trust hardening · **Priority:** P0 · **Status:** todo
**Depends on:** [F02](F02-auth-and-user-scoped-data.md), [F04](F04-image-storage-s3.md)
**Requirements:** F6.1; Privacy 6 (see [requirements](../requirements.md))

## Context

Not started.

## Scope

- Export: JSON + images as a zip via presigned download.
- Delete everything in one action: DynamoDB records, S3 objects (both buckets), identity-provider user, consents.
- Define and document the backup erasure window (DynamoDB PITR, S3 versioning).

## Acceptance criteria

- [ ] After delete, no records or objects remain for the user (integration test).
