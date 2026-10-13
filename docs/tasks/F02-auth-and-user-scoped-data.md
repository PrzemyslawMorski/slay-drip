---
id: F02
title: Authentication and per-user data model
slice: Foundation (Session 1)
priority: P0
status: todo
depends_on: []
---

# F02 · Authentication and per-user data model

**Slice:** Foundation (Session 1) · **Priority:** P0 · **Status:** todo
**Depends on:** —
**Requirements:** F1.1; Privacy 6, 7, 8; Workshop #1 (see [requirements](../requirements.md))

## Context

All API Gateway methods use `authorization = "NONE"`, items/outfits carry no owner, and `GetAllItems` scans the whole table with `begins_with(pk, "ITEM#")`. Nothing user-facing (consent, export, delete) can be built without users.

## Scope

- Add an EU-hosted identity provider (e.g. Cognito user pool in `eu-central-1`) via Terraform.
- Add a Cognito/JWT authorizer to every API Gateway method; keep CORS preflight open.
- Re-key DynamoDB: `pk = USER#<sub>`, `sk = ITEM#<id>` / `OUTFIT#<id>`; replace `Scan` with `Query` on `pk`.
- Take the user id from the authorizer claims in handlers, never from the request body.
- Frontend: sign-up / sign-in / sign-out, token storage and refresh, attach `Authorization` header in `services/api.ts`.
- Remove the unused `user_id` GSI or use it consistently.

## Acceptance criteria

- [ ] Unauthenticated requests get 401.
- [ ] User A cannot read, list or modify user B's items or outfits (covered by a handler test).
- [ ] No `Scan` remains on user data paths.
- [ ] A synthetic persona can sign up and land on an empty wardrobe.
