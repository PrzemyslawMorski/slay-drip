# F05 · Fail-closed EU config and API hardening

| Field | Value |
| --- | --- |
| **Key** | F05 |
| **Issue type** | Task |
| **Priority** | High |
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

`config/environment.go` used to read the region from `AWS_REGION` and fall back to `us-east-1`. The region is now fixed by Terraform's `scw_region` variable, which accepts EU regions only. Handlers return raw `err.Error()` to clients, CORS is `*`, and create endpoints require the client to send an `id`.

**Scope**

- Fail startup if region is not an approved EU region (allow-list).
- Log internal errors; return generic messages + a correlation id.
- Restrict CORS to the frontend's Object Storage website domain (and localhost in dev).
- Generate IDs server-side (UUID) and validate request bodies (size, enums).
- Add `go test ./...` and `go vet` to the API container workflow; add first handler unit tests.

## Acceptance criteria

- [ ] API container refuses to start outside the EU allow-list.
- [ ] No DB error text in API responses.
- [ ] Backend tests run in CI.

## Dependencies

None: can start now.

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: Privacy 2; Privacy 5 (see [requirements](../requirements.md))
