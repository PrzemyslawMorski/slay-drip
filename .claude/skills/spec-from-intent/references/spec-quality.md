# Spec quality

## Length budget

A spec fits in one sitting: roughly 150 to 300 lines of markdown. If it runs longer, the scope is probably too big for one spec. Offer to split it, with each part getting its own ID in the same session.

## Wording rules

- Name the persona from the requirements, not a generic "user".
- Write acceptance criteria as observable results: "the outfit card shows the item's name", not "the feature works".
- One behaviour per checkbox. If a line joins two behaviours with "and", split it.
- Use numbers with units for every target: "under 2 s at p95", "100% of hard constraints".
- Do not restate the requirement in full. Link it and say what this spec adds.
- Do not restate an ADR. Link it.
- Keep design notes at the level of flows and boundaries. Leave code-level detail to the PR.
- Never use flaw language about bodies ("hide", "slimming", "unflattering") and never mention weight. Candid mode may be frank about fit and proportion, never about a body's worth.
- Use only synthetic personas in examples and test plans. Never write real names, real photos or real measurements.

## Compliance lines

Every spec keeps these lines in its "Quality and compliance" section, each either filled in or marked "N/A: <reason>":

- AI quality bar (only if AI is involved): tagging accuracy per attribute, p95 latency, rubric score, fairness parity across body types and skin tones.
- Hard constraints (only if outfits are generated): availability, weather, modesty and adaptive rules, checked automatically at 100%.
- Consent, retention and EU-only impact: which consent it needs, how revocation deletes the data, which Scaleway region holds it.
- Accessibility impact: WCAG 2.1 AA checks for any UI change.

## Final checklist

Run each check and fix any failure before reporting back:

1. The header has ID, title, Status, Slice, Priority, Depends on and Related.
2. The spec names the F-number or non-functional item it serves, or says the gap is recorded in Risks.
3. Every template heading is present. No heading is empty.
4. No placeholder text from the template remains.
5. Every acceptance criterion is a checkbox and names an observable result.
6. Every compliance line is filled in or marked N/A with a reason.
7. The Test plan names at least one check and the local stack that runs it.
8. Every relative link resolves to a file that exists.
9. Every discovery note or ADR the spec depends on is linked, and no open decision is decided in the spec.
10. The spec contains no real personal data, no secrets and no environment-file values.
11. The Status is Draft unless the user chose Ready.
