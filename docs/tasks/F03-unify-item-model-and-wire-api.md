---
id: F03
title: Unify the item/outfit model and wire the frontend to the API
slice: Foundation
priority: P0
status: todo
depends_on: [F02, F04]
---

# F03 · Unify the item/outfit model and wire the frontend to the API

**Slice:** Foundation · **Priority:** P0 · **Status:** todo
**Depends on:** [F02](F02-auth-and-user-scoped-data.md), [F04](F04-image-storage-s3.md)
**Requirements:** F2.3; F2.4; Launch market: menswear + womenswear (see [requirements](../requirements.md))

## Context

The frontend never calls the backend: every page uses `useIndexedDB('wardrobeState')` and `services/api.ts` is unused. Models disagree (frontend: `color`, `brand`, `tags`, base64 `image`, outfit embeds full items; backend: `name`, `category`, `imageUrl`, outfit holds `itemIds`). Categories are womenswear-leaning (`dress`, `bag`).

## Scope

- Define one item schema shared by Go and TS (consider generating TS types from an OpenAPI spec — `types.go` already has `@openapi` hints). Fields: category, colours[], pattern, material, formality, season[], fit, state (`available`/`laundry`/`stored`), wornCount, lastWornAt, imageKey, tagSource (ai/user), timestamps.
- Gender-neutral category taxonomy that covers menswear and womenswear; style preference lives on the profile, not on items.
- Outfits reference `itemIds`, never embed item copies.
- Add the missing endpoints: update and delete for items and outfits (frontend already calls them).
- Replace `useIndexedDB` page state with API calls (a small data hook / query cache); keep IndexedDB only as an optional offline cache.
- Remove or gate `DebugPage` in live builds.

## Acceptance criteria

- [ ] Wardrobe, upload and outfit pages read/write through the API.
- [ ] TS and Go models match (type check or contract test).
- [ ] Deleting an item updates outfits server-side consistently.
