# S1-01 · 18+ gate and granular consent screens

| Field | Value |
| --- | --- |
| **Key** | S1-01 |
| **Issue type** | Story |
| **Priority** | Highest |
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

No age gate or consent exists.

**Scope**

- Date-of-birth check at sign-up; block under-18 sign-up (store only the fact `isAdult`, not the DOB, unless required).
- Separate, revocable consents: body photo, measurements, wardrobe photos, weather/location; explicit consent for modesty and adaptive-needs fields.
- Persist consent records (type, version, timestamp) server-side.
- Backend refuses to accept data for a type without active consent.
- Plain-language privacy page explaining what the AI sees.

## Acceptance criteria

- [ ] Under-18 sign-up is impossible.
- [ ] Each data type is blocked until its consent is granted (API test per type).
- [ ] Consent text is versioned.

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [F02](F02-auth-and-user-scoped-data.md) | To Do | Authentication and per-user data model |
| blocks | [S2-01](S2-01-single-item-camera-capture.md) | To Do | Single-item camera capture |
| blocks | [S4-01](S4-01-style-profile-and-constraints.md) | To Do | Style preferences, hard constraints and tone setting |
| blocks | [S5-02](S5-02-weather-context.md) | To Do | Local weather context |
| blocks | [S7-02](S7-02-retention-toggles-and-consent-revocation.md) | To Do | Photo retention toggles and consent revocation |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F1.1; Privacy 4, 8; GDPR Art. 9 note (see [requirements](../requirements.md))
