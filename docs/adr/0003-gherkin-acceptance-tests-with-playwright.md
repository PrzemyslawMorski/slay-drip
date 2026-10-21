# ADR-0003: Gherkin acceptance tests run on Playwright

**Status:** Proposed
**Date:** 2026-10-21
**Deciders:** Outfit Planner team (product owner to accept)
**Related:** [S1-01](../specs/S1-01-anonymous-wardrobe-upload.md), [ADR-0002](0002-frontend-framework-and-build-tooling.md), [CLAUDE.md](../../CLAUDE.md) (quality bar), [security guide](../security.md) (section 16)

## Context

Every ticket writes its acceptance criteria as Gherkin scenarios, and each scenario must map to at least one automated test (ticket template). The app's acceptance behaviour depends on real browser features: file inputs, `createImageBitmap` and canvas re-encoding, IndexedDB, and network requests. A simulated DOM does not reproduce these faithfully. Security tests in the guide also need to observe real requests (section 16: "no request leaves the device").

Two needs compete: scenarios should be readable by product people, and the checks should run in a real browser.

## Decision

We will write acceptance scenarios as `.feature` files in `frontend/tests/features/`, and run them with **playwright-bdd** on **Playwright** in Chromium. Step definitions live in `frontend/tests/steps/`, with shared helpers in `frontend/tests/support/`. Unit tests for pure logic use Vitest, which the team adds with the first pure module that needs it.

- **Runner:** `npm run test:acceptance` from `frontend/` (Playwright, with the dev server started by Playwright).
- **Browsers:** Chromium only for this slice, with a mobile device profile for the mobile-first layout. WebKit (Safari) is added before the first iOS-sensitive ticket, because Safari's canvas and IndexedDB behaviour differs.
- **Accessibility:** `@axe-core/playwright` runs in the wardrobe scenario.
- **Test data:** generated during the run. No photo files are committed.

## Options considered

### Option A: playwright-bdd on Playwright (chosen)

- Pros: real browser, real file inputs and network. Gherkin is compiled to Playwright tests, so the same runner does reporting and retries. One tool for acceptance and end-to-end.
- Cons: slower than unit tests. Needs a browser download once per machine.

### Option B: Cucumber.js with a separate Playwright driver

- Pros: standard Cucumber toolchain and reporting.
- Cons: two runners, manual browser lifecycle and a separate config. More glue code for the same result.

### Option C: Vitest with vitest-cucumber in jsdom

- Pros: fast and runs in the unit test runner.
- Cons: jsdom has no canvas, no `createImageBitmap`, and no real file or network behaviour. The EXIF and network scenarios could not be proven, so they would need mocks that test the mocks.

## Consequences

- Positive: scenarios prove the behaviour in a browser, including the privacy scenarios. The Gherkin files can be shared with the product owner for review.
- Negative: the first run downloads Chromium. Acceptance runs are slower than unit runs, so they stay narrow.
- Follow-up work:
  - Add WebKit before the first ticket that depends on iOS Safari behaviour.
  - Add Vitest when the first pure module needs unit tests (for example the file-type sniffing).
  - CI wiring belongs with the first deploy ticket, not this one.

## Compliance check

- [x] EU-only processing: tests run locally. No test sends data to a vendor.
- [x] Consent and retention impact: the tests check that consent gates storage and that withdrawal deletes photos.
- [x] Special-category data impact: none.
- [x] Hard constraints remain hard filters: not applicable.
- [x] Test data is synthetic: all images and files are generated during the run.

## Revisit when

- Scenarios need a real device (iOS or Android) rather than an emulated one.
- The suite runtime exceeds what the team accepts for a pull request check.
- A feature needs a test that only a server-side harness can run.
