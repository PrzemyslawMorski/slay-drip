# Dev tasks

Backlog derived from the gap analysis of the code against [requirements.md](../requirements.md) on 2026-10-13.

**Conventions:** one file per ticket, built from the [ticket template](../templates/ticket.md). Update the **Status** row in the ticket table (To Do → In Progress → Done) and tick acceptance criteria as you go. Priorities: P0 = Highest (needed for the slice's done-when), P1 = High (should), P2 = Medium (nice to have). Dependencies must match in both the ticket and the table below.

Foundation tasks (`F`) fix structural issues in the current code and should land before or during Session 1. `S<n>` tasks map to the workshop sessions.


## Foundation

| ID | Task | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| F01 | [Normalise line endings](F01-normalise-line-endings.md) | P0 | — | done |
| F02 | [Authentication and per-user data model](F02-auth-and-user-scoped-data.md) | P0 | F11 | todo |
| F03 | [Unify the item/outfit model and wire the frontend to the API](F03-unify-item-model-and-wire-api.md) | P0 | F02, F04 | todo |
| F04 | [Image storage in Object Storage with presigned uploads](F04-image-storage-s3.md) | P0 | F02 | todo |
| F05 | [Fail-closed EU config and API hardening](F05-eu-only-and-api-hardening.md) | P1 | — | todo |
| F06 | [Pin CI tooling and add lint](F06-ci-hygiene.md) | P2 | — | todo |
| F07 | [Rename to working name and externalise strings](F07-rename-and-i18n.md) | P2 | — | todo |
| F08 | [Eval harness and golden-set scaffold](F08-eval-harness-and-golden-set.md) | P0 | — | todo |
| F09 | [AI cost tracking per active user](F09-ai-cost-tracking.md) | P1 | F02 | todo |
| F10 | [Spike: EU-hosted model selection](F10-spike-eu-model-selection.md) | P0 | F08 | todo |
| F11 | [Spike: Keycloak on Scaleway Serverless Containers](F11-keycloak-serverless-spike.md) | P0 | — | todo |

## Session 1 – Walking skeleton

| ID | Task | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| S1-01 | [18+ gate and granular consent screens](S1-01-age-gate-and-consent.md) | P0 | F02 | todo |
| S1-02 | [PWA install and camera readiness on iOS/Android](S1-02-pwa-camera-and-https-check.md) | P1 | — | todo |

## Session 2 – Capture + tagging

| ID | Task | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| S2-01 | [Single-item camera capture](S2-01-single-item-camera-capture.md) | P0 | F03, F04, S1-01 | todo |
| S2-02 | [AI auto-tagging with editable tags](S2-02-ai-auto-tagging.md) | P0 | S2-01, F10, F09 | todo |
| S2-03 | [Background removal for flat-lay images](S2-03-background-removal.md) | P1 | S2-01, F10 | todo |
| S2-04 | [Tagging accuracy eval](S2-04-tagging-eval.md) | P0 | F08, S2-02 | todo |

## Session 3 – Bulk capture

| ID | Task | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| S3-01 | [Bulk rack/closet capture with AI segmentation](S3-01-bulk-capture-segmentation.md) | P0 | S2-02, F10 | todo |
| S3-02 | [Human-in-the-loop correction UI](S3-02-correction-ui.md) | P0 | S3-01 | todo |

## Session 4 – Profile

| ID | Task | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| S4-01 | [Style preferences, hard constraints and tone setting](S4-01-style-profile-and-constraints.md) | P0 | S1-01 | todo |
| S4-02 | [Colouring and proportions from photo or measurements](S4-02-colouring-and-proportions.md) | P0 | S4-01, F04, F10 | todo |
| S4-03 | [Body-talk guardrails and tone tests](S4-03-tone-guardrails-and-tests.md) | P0 | F08, S4-02 | todo |

## Session 5 – Recommendation

| ID | Task | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| S5-01 | [Outfit request: occasion presets and free text](S5-01-outfit-request-ui.md) | P0 | F03 | todo |
| S5-02 | [Local weather context](S5-02-weather-context.md) | P0 | S1-01 | todo |
| S5-03 | [Recommendation engine with hard-constraint filter](S5-03-recommendation-engine.md) | P0 | S2-02, S4-01, S4-02, S5-01, S5-02, F09 | todo |
| S5-04 | [Flat-lay collage rendering](S5-04-flat-lay-collage.md) | P0 | S2-03, S5-03 | todo |
| S5-05 | [Swap a piece / show me another](S5-05-swap-and-show-another.md) | P1 | S5-03 | todo |
| S5-06 | [Outfit quality eval with LLM judge and fairness check](S5-06-outfit-quality-eval.md) | P0 | F08, S5-03 | todo |

## Session 6 – Personalisation

| ID | Task | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| S6-01 | [Like / reject with reasons](S6-01-feedback-like-reject.md) | P0 | S5-03 | todo |
| S6-02 | ["Wore it", wear history and item states](S6-02-wear-history-and-item-states.md) | P0 | F03 | todo |
| S6-03 | [Taste profile feeding ranking](S6-03-taste-profile.md) | P0 | S6-01, S6-02 | todo |
| S6-04 | [Gap insights](S6-04-gap-insights.md) | P1 | S5-03 | todo |

## Session 7 – Trust hardening

| ID | Task | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| S7-01 | [Export all data and delete account](S7-01-export-and-delete-all.md) | P0 | F02, F04 | todo |
| S7-02 | [Photo retention toggles and consent revocation](S7-02-retention-toggles-and-consent-revocation.md) | P0 | S1-01, F04 | todo |
| S7-03 | [Red-teaming and security/privacy review](S7-03-red-team-and-security-review.md) | P0 | S4-03, S5-03 | todo |
| S7-04 | [DPIA inputs and data inventory](S7-04-dpia-inputs.md) | P0 | S7-01, S7-02 | todo |
| S7-05 | [WCAG 2.1 AA audit](S7-05-accessibility-audit.md) | P1 | — | todo |

## Session 8 – Pilot

| ID | Task | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| S8-01 | [Pilot metrics instrumentation and dashboard](S8-01-metrics-instrumentation-and-dashboard.md) | P0 | S5-03, S6-02, F09 | todo |
| S8-02 | [Pilot launch and onboarding](S8-02-pilot-onboarding.md) | P0 | S7-04, S8-01 | todo |
