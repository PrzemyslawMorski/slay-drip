# S5-03 · Recommendation engine with hard-constraint filter

| Field | Value |
| --- | --- |
| **Key** | S5-03 |
| **Issue type** | Story |
| **Priority** | Highest |
| **Status** | To Do |
| **Epic** | Session 5 – Recommendation |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Session 5 – Recommendation |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

Not started.

**Scope**

- Deterministic pre-filter: exclude unavailable items and anything violating weather, modesty, adaptive or never-wear rules.
- Model/agent proposes and ranks 3 outfits from the filtered set; prefer under-worn items; skip outfits worn in the last N days (user setting).
- Each outfit gets a 1–2 sentence rationale (occasion, colouring, proportions) and the list of signals used.
- If the wardrobe can't satisfy the request, say so and return a gap suggestion instead.
- Latency budget and streaming of the first result.

## Acceptance criteria

- [ ] 3 outfits returned in ≤ 10 s p95 on the golden set.
- [ ] Hard constraints hold 100% (automated check).

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S2-02](S2-02-ai-auto-tagging.md) | To Do | AI auto-tagging with editable tags |
| is blocked by | [S4-01](S4-01-style-profile-and-constraints.md) | To Do | Style preferences, hard constraints and tone setting |
| is blocked by | [S4-02](S4-02-colouring-and-proportions.md) | To Do | Colouring and proportions from photo or measurements |
| is blocked by | [S5-01](S5-01-outfit-request-ui.md) | To Do | Outfit request: occasion presets and free text |
| is blocked by | [S5-02](S5-02-weather-context.md) | To Do | Local weather context |
| is blocked by | [F09](F09-ai-cost-tracking.md) | To Do | AI cost tracking per active user |
| blocks | [S5-04](S5-04-flat-lay-collage.md) | To Do | Flat-lay collage rendering |
| blocks | [S5-05](S5-05-swap-and-show-another.md) | To Do | Swap a piece / show me another |
| blocks | [S5-06](S5-06-outfit-quality-eval.md) | To Do | Outfit quality eval with LLM judge and fairness check |
| blocks | [S6-01](S6-01-feedback-like-reject.md) | To Do | Like / reject with reasons |
| blocks | [S6-04](S6-04-gap-insights.md) | To Do | Gap insights |
| blocks | [S7-03](S7-03-red-team-and-security-review.md) | To Do | Red-teaming and security/privacy review |
| blocks | [S8-01](S8-01-metrics-instrumentation-and-dashboard.md) | To Do | Pilot metrics instrumentation and dashboard |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: F3.2; F3.3; F3.5; F3.6; Privacy 10; NFR: p95 ≤ 10 s (see [requirements](../requirements.md))
