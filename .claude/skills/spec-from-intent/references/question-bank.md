# Interview question bank

Use these as starting points. Adapt the wording to the intent, keep 2 to 4 options each, and put the recommended option first. Skip any question the intent already answers.

## Session and scope

**Which workshop session does this belong to?**
- Options: one per session in the workshop plan, labelled "Session N: <slice shipped>". Recommend the session whose slice matches the intent best.

**Is this a walking-skeleton piece, a full slice, or a follow-up to an existing spec?**
- "New slice (Recommended)", "Follow-up to an existing spec (name it)", "Hardening or fix for an existing feature".

## Goals and non-goals

**What is the single most important outcome for the user?**
- Offer three outcomes drawn from the intent, plus "Something else (describe)".

**What is explicitly out of scope for this spec?**
- Offer options drawn from the intent's context, such as "Nothing beyond the stated intent", "Cloud storage", "AI or ranking", "Accounts or sign-in".

## Acceptance

**How will we know it works?**
- Offer "A persona completes the flow in under N seconds", "A visible state appears", "An automated test passes", "A user can undo it". Ask for the number when it matters.

**Which error or edge case must be covered?**
- Offer "Empty state", "Network failure", "Too many items", "Consent refused". Choose two or three from the intent.

## Dependencies

**Does this need an existing spec first?**
- List the existing `docs/specs/S*.md` files as options, plus "None, it can start now (Recommended)".

## Data and compliance

**Does it touch personal or body data?**
- "No personal data (Recommended)", "Wardrobe photos", "Measurements or body photo", "Weather or location", "More than one (list them)".

**Does it change what the AI does?**
- "No AI involved (Recommended)", "Tagging", "Outfit generation or ranking", "Feedback that changes the ranking".

**Does it touch modesty or adaptive-needs fields?**
- "No (Recommended)", "Yes, these are hard filters". If yes, the spec must mention explicit consent for these fields (GDPR Art. 9), and the DPO review is still open.

## Priority and status

**What priority?**
- "P1 High (Recommended)", "P0 Highest (blocks the session)", "P2 Medium".

**What status should the spec start at?**
- "Draft (Recommended)", "Ready for build".

## Open decisions

**The spec depends on an open decision. How should we handle it?**
- "Write a discovery note first (Recommended)", "Pick a provisional option and flag it", "Leave it as an open question".
