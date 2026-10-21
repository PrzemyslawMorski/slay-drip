# Product guardrails

Source: [CLAUDE.md](../../CLAUDE.md) "Hard rules" and "Quality bar for AI features", [security.md §7, §8](../security.md#7-images-and-body-photos), and [requirements.md](../requirements.md).

## Blocking when the diff

- **Body talk:** user-facing copy, prompts or model output mention weight, or use flaw language ("hide", "slimming", "unflattering"). This applies in candid mode too. Candid mode may be frank about fit and proportion, never about a body's worth.
- **Hard constraints as weights:** availability, weather, modesty or adaptive constraints are applied as ranking weights or model instructions instead of code-enforced filters that run before display.
- **Weak outfit fill:** the code returns an outfit that breaks a constraint, or fills a slot with a weak item, instead of an honest "cannot" with a gap suggestion.
- **No transparency:** a recommendation does not state which signals it used.
- **Identification:** any face recognition, face embedding, or matching users or photos across accounts. Body photos must never identify anyone.
- **Personal data in AI prompts:** names, emails, user IDs or location sent to a model. Use an opaque per-request reference.
- **Untrusted user text:** free-text occasions, item names or notes are passed to a model as instructions, or model output can change permissions or write to other users' data.
- **Real data in the repo:** test fixtures, samples or prompts use real people or real photos. Workshop data is synthetic, freely licensed personas only.
- **UI copy:** user-facing strings are inline literals instead of externalised strings.
- **Accessibility:** a UI change that breaks WCAG 2.1 AA (contrast, keyboard access, labels, touch targets).

## Needs a decision (flag, do not decide)

- EU-hosted model choice (open decision, F10).
- Any change to the AI quality bar: per-attribute tagging accuracy, p95 first-result time, fairness parity.

## Check

- Banned-language checks and tone tests cover any new prompt or copy. A change that weakens them is a security regression.
- AI cost per active user is still tracked for any new AI call.
