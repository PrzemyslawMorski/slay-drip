# S4-02 · Colouring and proportions from photo or measurements

| Field | Value |
| --- | --- |
| **Key** | S4-02 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 4 – Profile |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 4 – Profile |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

Not started.

**Scope**

- Optional body-photo analysis → derived attributes (undertone, hair/eye contrast, colour season, proportion descriptors).
- Keep derived attributes only; delete raw photo unless the user opts into retention.
- No face recognition or identification; optional face blur on stored photos.
- Measurements path with metric/imperial units, clearly labelled as lower quality.

## Acceptance criteria

- [ ] Profiles exist for every golden persona via both paths.
- [ ] Raw photo is deleted by default after analysis (test).

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S4-01](S4-01-style-profile-and-constraints.md) | To Do | Style preferences, hard constraints and tone setting |
| is blocked by | [F04](F04-image-storage-s3.md) | To Do | Image storage in Scaleway Object Storage with presigned uploads |
| is blocked by | [F10](F10-spike-eu-model-selection.md) | To Do | Spike: EU-hosted model selection |
| blocks | [S4-03](S4-03-tone-guardrails-and-tests.md) | To Do | Body-talk guardrails and tone tests |
| blocks | [S5-03](S5-03-recommendation-engine.md) | To Do | Recommendation engine with hard-constraint filter |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F1.2; F1.3; Privacy 3, 7 (see [requirements](../requirements.md))
