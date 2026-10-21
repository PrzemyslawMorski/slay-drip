# ADR-0009: Frontend lint, formatting and unit tests

**Status:** Accepted
**Date:** 2026-10-21
**Deciders:** Outfit Planner team (product owner to accept)
**Related:** [ADR-0002](0002-frontend-framework-and-build-tooling.md) (follow-up), [ADR-0003](0003-gherkin-acceptance-tests-with-playwright.md) (Vitest for pure logic), [frontend ruleset](../code-review/frontend-ruleset.md) (section 2, FE-10 to FE-13, FE-60), [security guide](../security.md) (section 12, dependency review)

## Context

ADR-0002 chose React, Vite and TypeScript for the client and left lint and formatting to a follow-up. The [frontend ruleset](../code-review/frontend-ruleset.md) makes ESLint, Prettier and Vitest blocking once they exist (FE-10, FE-11, FE-60). ADR-0003 says Vitest covers pure logic and Playwright covers the browser.

The tooling choices have version constraints that a future upgrade must respect:

- `typescript-eslint` 8.x declares a peer range of TypeScript below 6.1.0. npm refuses to install TypeScript 7.0.2 alongside it, so the project pins TypeScript to `~6.0.3`.
- `eslint-plugin-jsx-a11y` supports ESLint up to 9 only. ESLint 10 is therefore not used.
- ESLint 9 is deprecated upstream in favour of ESLint 10, so this choice has an expiry date.
- With npm 10.9, adding Vitest crashes with `Cannot read properties of null (reading 'edgesOut')`. Installs in this repo use npm 11 (`npx --yes npm@11.21.1 install ...`). Other installs work with npm 10.

## Decision

We will lint and format the frontend with the following, pinned in `frontend/package.json`:

- **ESLint 9.39.5** with a flat config (`frontend/eslint.config.js`): `typescript-eslint` 8.71.1 (recommended, type-checked), `eslint-plugin-react-hooks` 7.1.1 and `eslint-plugin-jsx-a11y` 6.10.2, with `eslint-config-prettier` last so Prettier owns formatting.
- **Prettier 3.9.9** with `frontend/.prettierrc.json` (single quotes, trailing commas, print width 100). `npm run format:check` runs in CI.
- **Vitest 5.0.3** for unit tests of pure logic only, in the `node` environment, for files matching `src/**/*.test.{ts,tsx}`. Browser behaviour stays in the Playwright acceptance tests (ADR-0003).
- **TypeScript `~6.0.3`**, pinned for the reason above.

Lint rules that go beyond the presets:

- `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion`, `no-console` and `eqeqeq` are errors (FE-02, FE-04, FE-13).
- `@typescript-eslint/no-misused-promises` sets `checksVoidReturn: { attributes: false }`. React event attributes take void-returning callbacks, and async `onClick` handlers are the normal pattern. The rule still checks other void-return positions.

## Options considered

### Option A: ESLint 9 flat config, Prettier, Vitest, TypeScript 6 (chosen)

- Pros: every plugin the ruleset names supports this set today. The versions install cleanly with npm 11.
- Cons: ESLint 9 is deprecated upstream. TypeScript is one major behind. Installs need npm 11 for Vitest.

### Option B: ESLint 10 with TypeScript 7

- Pros: current ESLint line, no deprecation.
- Cons: `eslint-plugin-jsx-a11y` does not support ESLint 10. `typescript-eslint` 8.x does not support TypeScript 7.0.2. Either the accessibility rules or the type-checked rules would have to go, and FE-10 names both.

### Option C: Biome instead of ESLint and Prettier

- Pros: one tool for lint and format, fast.
- Cons: it does not run the `jsx-a11y` rules that FE-10 names, and the ruleset already assumes ESLint. This would be a new ADR-level change for no gain.

## Consequences

- Positive: lint, format, unit and build checks run on every frontend pull request (see the frontend CI workflow). The accessibility and type-checked rules are enforced.
- Negative: ESLint 9 and TypeScript 6 will need an upgrade. Contributors must use npm 11 for installs that add packages. The `no-misused-promises` setting is a deliberate deviation from the strictest default.
- Follow-up work:
  - Upgrade to ESLint 10 when `eslint-plugin-jsx-a11y` supports it.
  - Upgrade to TypeScript 7 when `typescript-eslint` supports it.
  - Add a coverage gate for Vitest, and a WebKit project for the acceptance tests (see the ruleset follow-ups).

## Compliance check

- [x] EU-only processing: development tooling only. Nothing here handles user data, and the new CI workflow uses no secrets.
- [x] Consent and retention impact: none.
- [x] Special-category data impact: none.
- [x] Hard constraints remain hard filters: not applicable to tooling.
- [x] Test data is synthetic: unit tests build their own bytes. Acceptance tests generate photos during the run.

## Revisit when

- `eslint-plugin-jsx-a11y` declares support for ESLint 10. Move to ESLint 10 in a new ADR or a supersede.
- `typescript-eslint` declares support for TypeScript 7. Remove the TypeScript 6 pin.
- A dependency in this set sends data to a non-EU host, or stops being maintained.
