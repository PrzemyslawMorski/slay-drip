# S1-02 · PWA install and camera readiness on iOS/Android

| Field | Value |
| --- | --- |
| **Key** | S1-02 |
| **Issue type** | Story |
| **Priority** | High |
| **Status** | To Do |
| **Epic** | Session 1 – Walking skeleton |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 1 – Walking skeleton |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

There is a manifest and service worker, but no camera capture and no device verification. `App.tsx` blocks double-tap zoom on iOS, which hurts accessibility.

**Scope**

- Verify install and offline shell on recent iOS Safari and Android Chrome via the HTTPS frontend URL on Scaleway Object Storage.
- Remove the double-tap zoom prevention (WCAG 1.4.4).
- Basic accessibility pass of the shell (landmarks, focus order, contrast).

## Acceptance criteria

- [ ] Install works on both platforms (screenshots in PR).
- [ ] Automated a11y check (axe) passes on shell pages.

## Dependencies

None: can start now.

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: NFR: installable PWA, camera capture, iOS Safari + Android Chrome; WCAG 2.1 AA (see [requirements](../requirements.md))
