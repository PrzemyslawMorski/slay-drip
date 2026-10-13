---
id: S1-01
title: 18+ gate and granular consent screens
slice: Session 1 – Walking skeleton
priority: P0
status: todo
depends_on: [F02]
---

# S1-01 · 18+ gate and granular consent screens

**Slice:** Session 1 – Walking skeleton · **Priority:** P0 · **Status:** todo
**Depends on:** [F02](F02-auth-and-user-scoped-data.md)
**Requirements:** F1.1; Privacy 4, 8; GDPR Art. 9 note (see [requirements](../requirements.md))

## Context

No age gate or consent exists.

## Scope

- Date-of-birth check at sign-up; block under-18 sign-up (store only the fact `isAdult`, not the DOB, unless required).
- Separate, revocable consents: body photo, measurements, wardrobe photos, weather/location; explicit consent for modesty and adaptive-needs fields.
- Persist consent records (type, version, timestamp) server-side.
- Backend refuses to accept data for a type without active consent.
- Plain-language privacy page explaining what the AI sees.

## Acceptance criteria

- [ ] Under-18 sign-up is impossible.
- [ ] Each data type is blocked until its consent is granted (API test per type).
- [ ] Consent text is versioned.
