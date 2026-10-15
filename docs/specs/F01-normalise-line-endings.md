# F01 · Normalise line endings

| Field | Value |
| --- | --- |
| **Key** | F01 |
| **Issue type** | Task |
| **Priority** | Highest |
| **Status** | Done |
| **Epic** | Foundation |
| **Components** | _to triage_ |
| **Labels** | — |
| **Story points** | — |
| **Sprint / Fix version** | Foundation |
| **Reporter** | Outfit Planner team |
| **Assignee** | Unassigned |

## Description

**Context**

The repo stores LF but Windows checkouts show CRLF, so `git status` lists 73 files as modified with no content change. Every future diff will rewrite whole files.

**Scope**

- Add `.gitattributes` with `* text=auto eol=lf` (plus `*.png`, `*.ico` etc. as `binary`).
- Run `git add --renormalize .` and commit once.
- Document `core.autocrlf=input` (or rely on `.gitattributes`) in `CLAUDE.md`.

## Acceptance criteria

- [x] Fresh clone on Windows shows a clean `git status`.
- [ ] No content-free diffs in the next PR.

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
