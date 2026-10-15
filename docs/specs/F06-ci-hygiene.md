# F06 · Pin CI tooling and add lint

| Field | Value |
| --- | --- |
| **Key** | F06 |
| **Issue type** | Task |
| **Priority** | Medium |
| **Status** | To Do |
| **Epic** | Foundation |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Foundation |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

Workflows use `bun-version: latest` and `lint` is a no-op. Builds aren't reproducible.

**Scope**

- Pin Bun, Go and Terraform versions in workflows.
- Add ESLint (with `jsx-a11y`) and `gofmt -l` checks.
- Remove the unused `package-lock.json` (Bun is the package manager) and unused vitest/jest/jsdom deps if `bun test` + happy-dom is the chosen stack.

## Acceptance criteria

- [ ] CI fails on lint/format violations.
- [ ] Only one lockfile in `frontend/`.

## Dependencies

None: can start now.

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with `gofmt` or the frontend test suite passing.
- [ ] Tests added or updated under `frontend/src/**/__tests__/` or `backend/lambda/**_test.go`.
- [ ] Quality and compliance checked, if the ticket touches AI, consent, retention or body data.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or `docs/specs/README.md` status), if behaviour changed.

## Notes

Requirements: — (see [requirements](../requirements.md))
