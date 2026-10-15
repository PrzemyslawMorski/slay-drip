# F03 · Unify the item/outfit model and wire the frontend to the API

| Field | Value |
| --- | --- |
| **Key** | F03 |
| **Issue type** | Task |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Foundation |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Foundation |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

The frontend never calls the backend: every page uses `useIndexedDB('wardrobeState')` and `services/api.ts` is unused. Models disagree (frontend: `color`, `brand`, `tags`, base64 `image`, outfit embeds full items; backend: `name`, `category`, `imageUrl`, outfit holds `itemIds`). Categories are womenswear-leaning (`dress`, `bag`).

**Scope**

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

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F02](F02-auth-and-user-scoped-data.md) | To Do | Authentication and per-user data model |
| is blocked by | [F04](F04-image-storage-s3.md) | To Do | Image storage in Scaleway Object Storage with presigned uploads |
| blocks | [S2-01](S2-01-single-item-camera-capture.md) | To Do | Single-item camera capture |
| blocks | [S5-01](S5-01-outfit-request-ui.md) | To Do | Outfit request: occasion presets and free text |
| blocks | [S6-02](S6-02-wear-history-and-item-states.md) | To Do | "Wore it", wear history and item states |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F2.3; F2.4; Launch market: menswear + womenswear (see [requirements](../requirements.md))
