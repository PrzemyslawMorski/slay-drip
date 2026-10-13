---
id: F01
title: Normalise line endings
slice: Foundation
priority: P0
status: todo
depends_on: []
---

# F01 · Normalise line endings

**Slice:** Foundation · **Priority:** P0 · **Status:** todo
**Depends on:** —
**Requirements:** — (see [requirements](../requirements.md))

## Context

The repo stores LF but Windows checkouts show CRLF, so `git status` lists 73 files as modified with no content change. Every future diff will rewrite whole files.

## Scope

- Add `.gitattributes` with `* text=auto eol=lf` (plus `*.png`, `*.ico` etc. as `binary`).
- Run `git add --renormalize .` and commit once.
- Document `core.autocrlf=input` (or rely on `.gitattributes`) in `AGENTS.md`.

## Acceptance criteria

- [ ] Fresh clone on Windows shows a clean `git status`.
- [ ] No content-free diffs in the next PR.
