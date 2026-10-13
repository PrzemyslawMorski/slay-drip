---
id: S1-02
title: PWA install and camera readiness on iOS/Android
slice: Session 1 – Walking skeleton
priority: P1
status: todo
depends_on: []
---

# S1-02 · PWA install and camera readiness on iOS/Android

**Slice:** Session 1 – Walking skeleton · **Priority:** P1 · **Status:** todo
**Depends on:** —
**Requirements:** NFR: installable PWA, camera capture, iOS Safari + Android Chrome; WCAG 2.1 AA (see [requirements](../requirements.md))

## Context

There is a manifest and service worker, but no camera capture and no device verification. `App.tsx` blocks double-tap zoom on iOS, which hurts accessibility.

## Scope

- Verify install and offline shell on recent iOS Safari and Android Chrome via CloudFront HTTPS.
- Remove the double-tap zoom prevention (WCAG 1.4.4).
- Basic accessibility pass of the shell (landmarks, focus order, contrast).

## Acceptance criteria

- [ ] Install works on both platforms (screenshots in PR).
- [ ] Automated a11y check (axe) passes on shell pages.
