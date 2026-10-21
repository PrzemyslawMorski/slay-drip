# ADR-0002: React, Vite and TypeScript for the client app

**Status:** Accepted
**Date:** 2026-10-21
**Deciders:** Outfit Planner team (product owner to accept)
**Related:** [S1-01](../specs/S1-01-anonymous-wardrobe-upload.md), [ADR-0003](0003-gherkin-acceptance-tests-with-playwright.md), [ADR-0004](0004-on-device-wardrobe-storage.md), [requirements](../requirements.md) (non-functional: mobile-first PWA), [security guide](../security.md) (sections 4, 11, 12), [CLAUDE.md](../../CLAUDE.md) (open decision: application stack)

## Context

The application stack is an open decision in CLAUDE.md, and this ADR is the first stack decision. Requirements fix some constraints:

- Mobile-first PWA: installable, camera capture, works on recent iOS Safari and Android Chrome.
- Accessible UI to WCAG 2.1 AA, with English strings externalised.
- The client must keep personal data on the device until it is needed, and must not load scripts or fonts from non-EU hosts (security guide, section 11 and section 4).
- Each new dependency is reviewed for maintenance, licence, size and whether it sends data anywhere (security guide, section 12).
- Session 1 is a walking skeleton with no backend yet. The first slice is a client-only app that runs locally.

The workshop audience includes engineers new to the project. The framework must be familiar enough that the workshop time goes to the product, not the tooling.

## Decision

We will build the client as a single-page app in **React and TypeScript**, bundled with **Vite**. It will be made installable as a PWA later, with a service worker plugin, once the production build is in scope.

- **Language:** TypeScript in strict mode.
- **UI:** React function components with hooks. No global state library for this slice.
- **Build and dev server:** Vite. `npm run dev` serves the app locally.
- **Local persistence:** `idb`, a small promise wrapper over IndexedDB (see [ADR-0004](0004-on-device-wardrobe-storage.md)).
- **Acceptance tests:** see [ADR-0003](0003-gherkin-acceptance-tests-with-playwright.md).
- **Package manager:** npm, with the lockfile committed.

Server rendering frameworks are not used. There is no server in this slice, and the EU-only hosting rules in ADR-0001 will decide the server side separately.

## Options considered

### Option A: React + Vite + TypeScript (chosen)

- Pros: most widely known UI library, so workshop participants can contribute quickly. Vite starts fast and has a small config. Mature PWA plugin for later. TypeScript catches consent and data-class mistakes at compile time.
- Cons: React needs more deliberate structure than a smaller framework to stay tidy. A client-only app gives no server-side rendering, which the app does not need yet.

### Option B: Vue + Vite + TypeScript

- Pros: gentle learning curve, good single-file components, same tooling as Option A.
- Cons: smaller hiring and workshop familiarity than React for this team. Less shared knowledge with the other tooling we plan (testing libraries, examples).

### Option C: SvelteKit or Next.js

- Pros: integrated routing and, for Next.js, server features.
- Cons: both assume a server. SvelteKit adds an adapter decision and Next.js is tied closely to one hosting model. Adding server features now would make a decision about hosting that ADR-0001 leaves open.

### Option D: Plain TypeScript with no UI framework

- Pros: no framework dependency to review, smallest bundle.
- Cons: DOM bookkeeping for lists, dialogs and focus management becomes ours to maintain. Harder for workshop participants to follow. More accessibility work by hand.

## Consequences

- Positive: a short path to a running app with `npm run dev`. Familiar patterns for the workshop. TypeScript and strict mode support the data-class rules in the code.
- Negative: React and the surrounding packages add a dependency review each time they change. The team owns the dependency upgrade path.
- Follow-up work:
  - Add the PWA plugin, manifest and service worker in a later ticket, with a decision recorded if it changes caching of personal data.
  - Add a Content Security Policy when the production build exists (security guide, section 11).
  - Record any new runtime dependency that touches data in its own ADR (security guide, section 4).
  - Lint, formatting and unit test tooling is recorded in [ADR-0009](0009-frontend-lint-format-and-unit-tests.md).

## Compliance check

- [x] EU-only processing: nothing is sent to a server in this slice. Build and dev tools run on the developer machine and do not handle user data.
- [x] Consent and retention impact: none directly. Storage is covered by [ADR-0004](0004-on-device-wardrobe-storage.md).
- [x] Special-category data impact: none.
- [x] Hard constraints remain hard filters: not applicable to the framework choice.
- [x] Test data is synthetic: tests generate their own images.

## Revisit when

- The team adopts a server-side rendering or hosting model that changes the framework choice.
- A required PWA or accessibility capability cannot be met with React.
- A dependency in the tree sends data to a non-EU host.
