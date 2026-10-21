# Frontend ruleset (React, TypeScript, Vite)

Applies to `frontend/`. Stack decisions: [ADR-0002](../adr/0002-frontend-framework-and-build-tooling.md) (React, Vite, TypeScript strict), [ADR-0003](../adr/0003-gherkin-acceptance-tests-with-playwright.md) (Playwright and playwright-bdd, Vitest for pure logic), [ADR-0004](../adr/0004-on-device-wardrobe-storage.md) (on-device storage), [ADR-0009](../adr/0009-frontend-lint-format-and-unit-tests.md) (lint, format and unit test tooling). Tests follow [tdd.md](tdd.md). Project-wide hard rules are in [CLAUDE.md](../../CLAUDE.md) and [security.md](../security.md), and the convention files in this folder cover them in detail.

Level: **Blocking** rules fail the review. **Advisory** rules are reported and may be deferred with a reason.

## 1. TypeScript

| ID | Rule | Level |
| --- | --- | --- |
| FE-01 | `strict` stays on. `npm run typecheck` passes with no errors. | Blocking |
| FE-02 | No `any`. Use `unknown` and narrow it, or a real type. | Blocking |
| FE-03 | No `@ts-ignore`. `@ts-expect-error` needs a comment saying why. | Blocking |
| FE-04 | No non-null assertion (`!`) without a comment that proves the value is set. | Blocking |
| FE-05 | Types for consent, data class and age are explicit. Do not use plain `boolean` for a consent state that has more than two meanings. | Advisory |
| FE-06 | `noUnusedLocals` and `noUnusedParameters` stay on. Do not disable them. | Blocking |

## 2. Lint and format

Lint and format are configured in `frontend/` (ADR-0009) and run in CI (`.github/workflows/frontend-ci.yml`). These rules apply to every frontend change.

| ID | Rule | Level |
| --- | --- | --- |
| FE-10 | ESLint with `typescript-eslint` (recommended, type-checked), `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y` runs with no errors. | Blocking |
| FE-11 | Formatting is enforced by one formatter (Prettier) in CI. No formatting debates in review. | Blocking |
| FE-12 | No `eslint-disable` without a rule name and a reason on the same line. | Blocking |
| FE-13 | No `console.log` left in committed code. Log events, not content (security guide §10). | Blocking |

## 3. React

| ID | Rule | Level |
| --- | --- | --- |
| FE-20 | Function components with hooks only. No class components. | Blocking |
| FE-21 | Hooks follow the rules of hooks, and `react-hooks/exhaustive-deps` is not disabled. | Blocking |
| FE-22 | No `dangerouslySetInnerHTML`. No `eval`, `new Function` or inline scripts (security guide §11). | Blocking |
| FE-23 | Keys in lists are stable IDs, not array indexes, unless the list never reorders. | Advisory |
| FE-24 | Components are small and do one job. Split a component when it has more than one reason to change. | Advisory |
| FE-25 | Side effects live in `useEffect` or event handlers. Derived values are computed during render, not stored in state. | Advisory |
| FE-26 | No global state library unless an ADR records it (ADR-0002). | Blocking |

## 4. Strings, copy and i18n

| ID | Rule | Level |
| --- | --- | --- |
| FE-30 | All user-facing text comes from `frontend/src/strings/` (externalised strings, CLAUDE.md). No inline literals in components. | Blocking |
| FE-31 | Copy follows the body-talk guardrails: no weight, and no "hide", "slimming" or "unflattering" (product-guardrails.md). | Blocking |
| FE-32 | Error messages say what happened and what to do next, and do not blame the user. | Advisory |

## 5. Accessibility (WCAG 2.1 AA)

| ID | Rule | Level |
| --- | --- | --- |
| FE-40 | Every interactive element is reachable and usable by keyboard, with a visible focus style. | Blocking |
| FE-41 | Every form control has a visible label. Icon-only buttons have an accessible name. | Blocking |
| FE-42 | Text contrast is at least 4.5:1 (3:1 for large text and UI components). | Blocking |
| FE-43 | Touch targets are at least 44×44 CSS px (this is stricter than WCAG 2.5.5, adopted here for the mobile-first app). Use semantic HTML before ARIA. | Blocking |
| FE-44 | The axe check in the acceptance tests passes on each new screen (ADR-0003). Do not disable a rule to pass. | Blocking |
| FE-45 | Layout works at phone width with a 16px side gutter and no horizontal page scroll. | Blocking |

## 6. Privacy and storage

| ID | Rule | Level |
| --- | --- | --- |
| FE-50 | Personal and body data is stored in IndexedDB through the storage module only (ADR-0004). Do not write it to `localStorage`, `sessionStorage` or cookies. | Blocking |
| FE-51 | Sign-out and account deletion clear local personal data. A test covers it. | Blocking |
| FE-52 | Consent is checked before the feature reads or writes that data type. Hiding a control is not a check. | Blocking |
| FE-53 | Revoking consent deletes the data for that type, not only stops using it. | Blocking |
| FE-54 | Camera and location permissions are requested at the point of use, with a plain-language reason, and the app works when refused. | Blocking |
| FE-55 | Images are re-encoded before storage to strip EXIF (security guide §7). The strip has a test. | Blocking |
| FE-56 | No third-party scripts, fonts or styles from non-EU hosts. No analytics or error tracking without an ADR (EU-only rule). | Blocking |
| FE-57 | No personal data in URLs, query strings or logs. | Blocking |
| FE-58 | No secrets or `.env` values in the client bundle. Only public configuration (such as the API base URL) reaches the build (security guide §9). | Blocking |

## 7. Tests

| ID | Rule | Level |
| --- | --- | --- |
| FE-60 | Pure logic (parsing, validation, sniffing, ranking helpers) has Vitest unit tests. Run them with `npm run test:unit` (Vitest, ADR-0003 and ADR-0009). | Blocking |
| FE-61 | Every Gherkin scenario in a ticket runs in Playwright with playwright-bdd (ADR-0003). Step definitions live in `tests/steps/`. | Blocking |
| FE-62 | Tests query by role, label and visible text, not by CSS class or internal structure. | Advisory |
| FE-63 | Playwright tests do not use fixed `waitForTimeout` sleeps. Wait on a condition. | Blocking |
| FE-64 | Test data is generated during the run or synthetic. No photo files from real people are committed (ADR-0003). | Blocking |
| FE-65 | Network calls in tests to real vendors are blocked. Acceptance tests may only reach the local app and local stand-ins. | Blocking |

## 8. Performance and build

| ID | Rule | Level |
| --- | --- | --- |
| FE-70 | `npm run build` passes (`tsc --noEmit` and `vite build`). | Blocking |
| FE-71 | Install from the committed lockfile with `npm ci`. Commit the lockfile with any dependency change. | Blocking |
| FE-72 | Each new dependency is reviewed for maintenance, licence, size and whether it sends data anywhere (security guide §12). Note the review in the PR. | Blocking |
| FE-73 | Lazy-load screens and heavy modules when they are not needed for the first view. | Advisory |
| FE-74 | Feedback to the user for an action that takes more than about 1 second. First outfit results are a p95 target of 10 seconds (CLAUDE.md quality bar). | Advisory |

## 9. Reviewer checklist

- [ ] `npm run typecheck`, lint and `npm run build` pass.
- [ ] `npm run test:acceptance` passes, and each new scenario is tagged to its ticket.
- [ ] Unit tests exist for new pure logic (FE-60).
- [ ] No inline user-facing text, no body-talk words, no new third-party host.
- [ ] Keyboard, labels, contrast and touch targets checked on the new screen.
- [ ] Personal data stays in IndexedDB, and revoke and sign-out clear it.

## Follow-ups

Done (ADR-0009):

- ESLint and Prettier configs in `frontend/`, with the lint rules in section 2.
- Vitest, with the first pure module (`src/photos/preparePhoto.ts`).
- CI in `.github/workflows/frontend-ci.yml`: typecheck, lint, format check, unit tests, build, acceptance tests and `npm audit --audit-level=high`.

Still to do:

- Coverage gate in CI for Vitest, with the coverage target in [tdd.md](tdd.md) (TDD-13).
- WebKit project in the Playwright acceptance tests, for iOS Safari coverage.
