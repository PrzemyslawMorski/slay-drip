# F02 · Authentication and per-user data model

| Field | Value |
| --- | --- |
| **Key** | F02 |
| **Issue type** | Task |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Foundation (Session 1) |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Foundation (Session 1) |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

All API routes are unauthenticated, items/outfits carry no owner, and `GetAllItems` returns the whole `items` table. Nothing user-facing (consent, export, delete) can be built without users.

**Scope**

- Add an EU-hosted identity provider. Scaleway has no managed user directory, so the provider is an open decision (see CLAUDE.md); wire its configuration through Terraform and container secrets.
- Verify the identity provider's JWTs in the API container for every route; keep CORS preflight open.
- Add a `user_id` column to `items` and `outfits` in the Serverless SQL Database, and filter every query by it instead of reading whole tables.
- Take the user id from the authorizer claims in handlers, never from the request body.
- Frontend: sign-up / sign-in / sign-out, token storage and refresh, attach `Authorization` header in `services/api.ts`.
- Remove the unused `user_id` GSI or use it consistently.

## Acceptance criteria

- [ ] Unauthenticated requests get 401.
- [ ] User A cannot read, list or modify user B's items or outfits (covered by a handler test).
- [ ] No `Scan` remains on user data paths.
- [ ] A synthetic persona can sign up and land on an empty wardrobe.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| blocks | [F03](F03-unify-item-model-and-wire-api.md) | To Do | Unify the item/outfit model and wire the frontend to the API |
| blocks | [F04](F04-image-storage-s3.md) | To Do | Image storage in Scaleway Object Storage with presigned uploads |
| blocks | [F09](F09-ai-cost-tracking.md) | To Do | AI cost tracking per active user |
| blocks | [S1-01](S1-01-age-gate-and-consent.md) | To Do | 18+ gate and granular consent screens |
| blocks | [S7-01](S7-01-export-and-delete-all.md) | To Do | Export all data and delete account |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F1.1; Privacy 6, 7, 8; Workshop #1 (see [requirements](../requirements.md))
