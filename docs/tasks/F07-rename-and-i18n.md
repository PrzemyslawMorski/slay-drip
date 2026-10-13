---
id: F07
title: Rename to working name and externalise strings
slice: Foundation
priority: P2
status: todo
depends_on: []
---

# F07 · Rename to working name and externalise strings

**Slice:** Foundation · **Priority:** P2 · **Status:** todo
**Depends on:** —
**Requirements:** NFR: English UI with strings externalised (see [requirements](../requirements.md))

## Context

Manifest and UI say "Slay Drip – Virtual Wardrobe"; the requirements use the placeholder *Outfit Planner*. UI strings are inline in components.

## Scope

- Decide on the display name (product name is an open question) and update manifest, `index.html`, layout header.
- Introduce an i18n library (e.g. `react-i18next`) with an `en` resource file; move all user-facing strings.

## Acceptance criteria

- [ ] No hard-coded user-facing strings in components (lint rule or grep check).
- [ ] Display name comes from one config value.
