# Code review conventions

Checks that every code review in this repo applies, human or AI. They turn the project rules into things a reviewer can confirm in a diff.

## Start here: the rules come first

Before reviewing a change, read and follow these. They are the source of truth. The convention files below only restate their checkable parts.

1. [docs/requirements.md](../requirements.md): what the product must do, including the hard rules and the quality bar.
2. [CLAUDE.md](../../CLAUDE.md): hard rules, platform decisions, working conventions and open decisions.
3. [docs/security.md](../security.md): the security and privacy guide. Mandatory for any change that touches personal, body or special-category data, auth, storage, AI, CI or infrastructure.

If a convention here and one of those files disagree, the source file wins. Report the mismatch.

## Convention files

| File | Covers |
| --- | --- |
| [eu-only-processing.md](eu-only-processing.md) | Scaleway EU regions only, vendor DPAs, no AWS |
| [age-gate.md](age-gate.md) | 18+ enforced on the server at sign-up |
| [consent-and-gdpr.md](consent-and-gdpr.md) | Granular, revocable consent, special-category data, retention, data subject rights |
| [secrets-and-logging.md](secrets-and-logging.md) | No secrets in code, no personal data in logs |
| [product-guardrails.md](product-guardrails.md) | Body-talk language, hard constraints as filters, honest outputs, no identification, synthetic test data, WCAG 2.1 AA |
| [tdd.md](tdd.md) | Test-driven development: new code and changed behaviour need tests, bug fixes start red, no weakened tests |
| [backend-ruleset.md](backend-ruleset.md) | Go backend rules: lint, vulnerability checks, `testing` and fakes, errors, HTTP API, SQL, AI |
| [frontend-ruleset.md](frontend-ruleset.md) | React and TypeScript rules: strict types, lint, React, strings, WCAG 2.1 AA, on-device storage, tests |

## How to report

- **Blocking:** a change breaks a hard rule (CLAUDE.md "Hard rules", or a rule marked as a hard requirement in the source docs). Say which rule and where it is broken.
- **Needs a decision:** a change depends on an open decision (CLAUDE.md "Open decisions", or the open-decisions section of `security.md`). Flag it. Do not accept or reject the choice on the team's behalf.
- **Normal:** a gap against the security guide's PR checklist or a convention. Say what is missing.

Do not report a finding for a convention that the change does not touch.
