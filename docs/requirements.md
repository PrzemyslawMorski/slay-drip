# Outfit Planner — Product Scope & Requirements

Oct 8, 2026 · @Przemyslaw

> Source of truth: the "Slay Drip" Claude project doc *Outfit Planner — Product Scope & Requirements*. Copied into the repo on 2026-10-13 so code and requirements live together.

## Summary

We will build a mobile-first app that turns a person's own wardrobe into outfits for a chosen occasion in under 2 minutes, matched to their colouring, body shape and taste. It must be a viable product for real EU users, not a demo.

The same build is the backbone of a 6+ session AI Champions workshop series. Each session ships one feature slice end to end. Design leads; technology follows the design.

Working name: *Outfit Planner* (placeholder).

## Target user & problem

**Primary persona: the considered dresser.** Style-conscious adult (18+) who buys fewer, long-lasting pieces and likes planning outfits, but spends too long doing it. They don't need to be taught style. They need speed, variety and fresh combinations from what they already own, with their taste respected.

**Jobs to be done**

- "I have an interview tomorrow. Show me 3 smart options from my wardrobe that suit the weather."
- "I'm bored of my usual looks. Give me something more alternative using what I own."
- "Remind me what I haven't worn in a while and build around it."
- "Tell me which one piece would unlock the most new outfits."

**Launch market:** EU, English UI first. Menswear and womenswear both supported from v1.

**MVP success metrics** (targets to confirm in pilot)

| Metric | Definition | Target |
| --- | --- | --- |
| Time saved | Median time from opening the app to choosing an outfit (baseline confirmed with persona) | < 2 min (vs \~20 min self-reported baseline) |
| Wear-through rate | Suggested outfits marked "wore it" ÷ outfits viewed | ≥ 30% |
| Wardrobe utilisation | Share of owned items worn at least once in 30 days | +20% vs the user's first month |

## Scope & staging

The MVP is a closed loop: **capture wardrobe → build profile → ask for an occasion → get flat-lay outfits → react / wear → better next time.** Everything else is staged.

| Capability | MVP | Next | Later |
| --- | --- | --- | --- |
| Recommendation output | Flat-lay collage of own items + short "why it works" | Virtual try-on render on the user's photo (opt-in) | Try-on with suggested new items |
| Wardrobe ingestion | Mixed: bulk rack/closet photos split by AI, then per-item correction and single-item adds | Import from product URLs | Import from e-receipts / shop order history |
| Beyond own wardrobe | Generic gap suggestions ("a navy blazer unlocks 12 outfits"), no links | Shoppable / affiliate links | Partner retailer catalogues |
| Request input | Occasion presets + free-text mood/constraint tweak | Saved custom themes | Event planning (trip packing, week ahead) |
| Context | Weather, wear history, laundry/availability | Calendar integration (opt-in) | — |
| Personalisation | Likes, rejections, "wore it" feed a taste profile | Explainable taste profile the user can edit | — |
| Monetisation | Free | Freemium: try-on, unlimited items, stylist chat | Affiliate revenue |

**Explicitly out of scope for MVP:** native apps, social sharing/feeds, human stylists, users under 18, calendar access, purchase links.

## Functional requirements (MVP)

**F1. Onboarding & profile**

1. Age gate (18+) and separate, granular consent for: body photo, measurements, wardrobe photos, weather/location.
2. Body photo upload (optional, recommended) to derive colouring (skin undertone, hair, eye contrast) and proportions.
3. Measurements entry with metric/imperial units; a no-photo path that works from measurements alone, clearly labelled as lower quality.
4. Style preferences: menswear / womenswear / both (no assumption from gender), fit preferences, colours and items the user never wears.
5. Constraints: modest/cultural coverage rules and adaptive needs (e.g. no buttons, seated-friendly). Treated as hard filters, never violated.
6. Feedback tone: neutral by default; opt-in "be candid with me" mode.

**F2. Wardrobe**

1. Bulk capture: photo of a rail/shelf/open wardrobe, segmented by AI into individual items.
2. Single-item capture for additions and better shots.
3. Auto-tagging: category, colour(s), pattern, material, formality, season, fit; every tag user-editable.
4. Item states: available, in laundry, away/stored; worn count and last-worn date.
5. Background removal for clean flat-lay rendering.

**F3. Outfit request & recommendation**

1. Choose an occasion preset (e.g. interview, office, date, wedding guest, weekend, travel) and optionally add free text ("something alternative, a bit grungy").
2. Use today's local weather and exclude unavailable items.
3. Return 3 outfits as flat-lay collages, each with a 1–2 sentence rationale tied to the occasion, colouring and proportions.
4. "Swap this piece" per item and "show me another" per outfit.
5. Prefer under-worn items; avoid repeating an outfit worn in the last N days (user-set).
6. When the wardrobe can't satisfy a request, say so honestly and offer a gap suggestion instead of a weak outfit.

**F4. Feedback & learning**

1. Like / reject with an optional reason (colour, fit, vibe, not for this occasion).
2. "Wore it" logs the outfit and updates wear history.
3. Reactions update a per-user taste profile used in future ranking.

**F5. Gap insights**

1. Identify 1–3 generic items that would unlock the most new outfits, with the count. No product links in MVP.

**F6. Account & data control**

1. View, export (JSON + images) and delete all data in one action.
2. Toggle raw photo retention; delete any photo individually.

## Privacy, GDPR & trust

Privacy is designed in from the first session, not added before launch. Workshop sessions use only synthetic, freely licensed personas; real personal data appears only in the pilot.

**Watch out:** the inclusivity features may create *special-category* data under GDPR Art. 9. Modest-dress constraints can reveal religious belief, and adaptive needs can reveal health information. Body photos aren't biometric data unless used to identify someone, but we should never use them that way. Legal/DPO to confirm. Assume explicit consent is needed for those fields.

**Requirements**

1. **DPIA** completed before any real user data is collected.
2. **EU-only processing on Scaleway:** all hosting, storage, databases and AI inference run on Scaleway in EU regions (`fr-par` by default), with vendors under a DPA guaranteeing zero retention and no training on user data.
3. **Data minimisation:** keep derived attributes by default (colour season, proportion descriptors). Store raw body photos only if the user opts in (needed for try-on later).
4. **Granular, revocable consent** per data type. Revoking consent deletes that data.
5. **Encryption** at rest and in transit; body photos kept in a separate store with stricter access.
6. **Rights:** access, export and erasure self-service in the app; erasure propagates to backups within a defined window.
7. **No identification:** no face recognition, no matching users across accounts. Faces can be auto-blurred in stored photos.
8. **18+ only**, enforced at sign-up.
9. **Body-talk guardrails:** never mention weight or use flaw language ("hide", "slimming", "unflattering"), even in candid mode. Candid mode may be frank about fit and proportion, never about the body's worth.
10. **Transparency:** each recommendation says which signals it used. A plain-language privacy page explains what the AI sees.

## Non-functional & AI quality

**Product & platform**

- Mobile-first PWA: installable, camera capture, works on recent iOS Safari and Android Chrome.
- Outfit generation returns first results in ≤ 10 s at p95. Wardrobe tagging runs in the background.
- Accessible UI to WCAG 2.1 AA (supports the adaptive-needs audience).
- English UI with strings externalised for later localisation.
- AI cost per active user per month is tracked from day one, since it decides freemium pricing.

**AI quality (evaluation built alongside each slice)**

- A golden set of synthetic personas covering menswear and womenswear, a full size range (petite, tall, plus), a range of skin tones, and modest and adaptive constraints.
- Tagging accuracy is measured per attribute against hand-labelled items.
- Hard constraints (availability, weather, modesty, adaptive) must hold 100% of the time; checked automatically.
- Outfit quality is scored by a rubric (coherence, occasion fit, colour harmony, rationale honesty) with an LLM judge plus spot human review.
- Tone tests: a banned-language list and adversarial prompts ("tell me what makes me look fat") must never produce body-shaming.
- Fairness check: comparable quality scores across body types and skin tones in the golden set.

## Workshop plan

Eight sessions, each shipping one vertical slice to a shared EU-hosted environment. Every session runs **design → build → evaluate**, so participants practise AI across the whole lifecycle, not just coding. Pre-work: the workshop lead prepares the synthetic persona and wardrobe pack.

| # | Slice shipped | AI skill practised | Done when |
| --- | --- | --- | --- |
| 1 | Walking skeleton: PWA shell, sign-up, 18+ gate, consent screens, deploy | AI-assisted product framing, UX flows, scaffolding | A persona can sign up and land on an empty wardrobe |
| 2 | Single-item capture + auto-tagging | Vision models, structured output, tagging evals | Golden items tagged with measured accuracy |
| 3 | Bulk capture + correction UI | Image segmentation, human-in-the-loop UX | A rack photo becomes editable items |
| 4 | Profile: colouring + proportions, no-photo path, tone setting | Multimodal analysis, guardrail prompts | Profiles for all personas; tone tests pass |
| 5 | Outfit recommendation: presets + free text, weather, constraints, flat-lay | Prompt/agent design, ranking, eval harness with LLM judge | 3 outfits in ≤ 10 s; hard constraints hold 100% |
| 6 | Feedback, wear history, taste profile, gap insights | Personalisation, memory, measuring improvement | Ranking measurably shifts after feedback |
| 7 | Trust hardening: data export/delete, retention toggles, red-teaming | AI for security & privacy review, adversarial testing | DPIA inputs ready; red-team findings closed |
| 8 | Pilot launch + metrics dashboard | AI for analytics and feedback synthesis | Pilot users onboarded; metrics tracked |

Sessions 2–3 and 4 can run in parallel tracks if the group is large enough to split into teams.

## Open questions & risks

**Open questions**

- [ ] Who owns the product and IP, and who are the first pilot users (internal employees and partners vs external)? Needs a leadership decision.
- [ ] Is a viable product a goal Software Mind will fund past session 8 (hosting, AI costs, support), or does it end as a hand-over?
- [ ] Can we source enough freely licensed synthetic people and garment images, or do we generate them? Check licences for generated imagery.
- [ ] Which EU-hosted model(s) meet the vision quality bar? Needs a spike before session 2.
- [ ] DPO review of the special-category data question (modesty, adaptive needs).
- [ ] Product name and brand.

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Bulk wardrobe segmentation is unreliable on cluttered photos | Onboarding stalls; users quit before first outfit | Correction UI first-class; single-item fallback; set expectations in capture guidance |
| Onboarding effort (capturing 50+ items) kills activation | Low retention | Value after \~10 items; progressive capture prompts |
| Body-related advice hurts a user | Trust and reputational damage | Neutral default, banned language, tone red-teaming, easy report button |
| AI cost per user too high for freemium | Not viable | Track from session 1; cache tags; cheaper models for tagging |
| Quality varies across body types or skin tones | Excludes users; bias complaints | Diverse golden set and fairness check in every eval run |
| Workshop scope too big for 8 sessions | Unfinished product | Strict slice boundaries; anything in "Next" is a stretch goal only |
