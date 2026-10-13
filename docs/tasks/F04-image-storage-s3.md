---
id: F04
title: Image storage in S3 with presigned uploads
slice: Foundation
priority: P0
status: todo
depends_on: [F02]
---

# F04 · Image storage in S3 with presigned uploads

**Slice:** Foundation · **Priority:** P0 · **Status:** todo
**Depends on:** [F02](F02-auth-and-user-scoped-data.md)
**Requirements:** Privacy 2, 3, 5; F6.2 (see [requirements](../requirements.md))

## Context

Images are stored as base64 strings inside IndexedDB. Requirements need encrypted EU storage and a separate, stricter store for body photos.

## Scope

- Terraform: private S3 bucket for wardrobe images (SSE-KMS, block public access, `eu-central-1`) and a **separate** bucket + KMS key for body photos with narrower IAM.
- Endpoint issuing presigned PUT/GET URLs scoped to `users/<sub>/...` keys.
- Frontend uploads the compressed image directly to S3, stores only `imageKey` on the item.
- Lifecycle rule for orphaned uploads.

## Acceptance criteria

- [ ] No image bytes go through DynamoDB or IndexedDB.
- [ ] A user cannot fetch another user's image key (presign checks ownership).
- [ ] Body-photo bucket is not readable by the wardrobe-tagging role.
