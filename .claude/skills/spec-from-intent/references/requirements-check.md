# Requirement matching

The requirements file is `docs/requirements.md`. It holds the product scope, the functional requirements (F1 to F6, each a bold heading with numbered sub-items), the privacy and GDPR rules, the non-functional and AI quality bar, the workshop plan table, and open questions.

## Matching

1. Search the functional requirements for the nouns in the intent: body photo, wardrobe, outfit, occasion, weather, feedback, taste, export, delete, and so on.
2. If the user named an F-number, go straight to that item and check that the intent fits its text.
3. Prefer a sub-item match ("F1.4 style preferences") over a section match ("F1").
4. A requirement can be partly matched. Name the part it covers and the part it does not.
5. Check the non-functional section too. A spec can serve a quality bar (latency, fairness, tagging accuracy) rather than a feature.

## Confirming a match

Show the user the exact requirement text and ask one question:

- Options: "Yes, this requirement (Recommended)", "Partly, I will narrow the scope", "No match, propose a new requirement".

## Proposing a new requirement

Only when the user chooses to propose one. Draft it in chat first, in the same style as the existing items:

- A bold heading with the next free F-number or a sub-item of the closest F-section.
- One to three numbered sub-items, each testable.
- A "Why" line that names the persona or the business outcome.

Ask the user to approve the wording (Approve, Edit wording, Drop it). Write it into `docs/requirements.md` only after approval, and mention the change in the handover. Never change an existing requirement's meaning without asking.

## When no match is possible

If the intent conflicts with a hard rule (18+, consent, EU-only, no identification, body-talk guardrails, hard constraints), say so and do not draft a spec that breaks the rule. Offer the user a version that complies, or ask how to proceed.
