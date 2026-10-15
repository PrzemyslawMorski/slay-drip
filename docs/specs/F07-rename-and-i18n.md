# F07 · Rename to working name and externalise strings

| Field | Value |
| --- | --- |
| **Key** | F07 |
| **Issue type** | Task |
| **Priority** | Medium |
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

Manifest and UI say "Slay Drip – Virtual Wardrobe"; the requirements use the placeholder *Outfit Planner*. UI strings are inline in components.

**Scope**

- Decide on the display name (product name is an open question) and update manifest, `index.html`, layout header.
- Introduce an i18n library (e.g. `react-i18next`) with an `en` resource file; move all user-facing strings.

## Acceptance criteria

- [ ] No hard-coded user-facing strings in components (lint rule or grep check).
- [ ] Display name comes from one config value.

## Dependencies

None: can start now.

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: NFR: English UI with strings externalised (see [requirements](../requirements.md))
