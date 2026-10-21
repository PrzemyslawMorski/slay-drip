# EU-only processing

Source: [CLAUDE.md](../../CLAUDE.md) "Hard rules" and [security.md §4](../security.md#4-eu-only-processing).

## Blocking when the diff

- Sets a cloud region outside `fr-par`, `nl-ams` or `pl-waw`, or adds a setting that allows one. The default is `fr-par`.
- Adds or uses an AWS service, SDK, CLI, endpoint or credential. The AWS stack is retired.
- Adds a vendor, SDK or endpoint that may receive personal, body or AI data (CDN, font, analytics, error tracking, AI model) without an ADR in `docs/adr/` that records EU processing and a zero-retention, no-training DPA.
- Loads a script, font, style or image from a non-EU host in the client.
- Lets the API start outside the region allow-list (F05), or removes that check.

## Needs a decision (flag, do not decide)

- The EU-hosted model choice for AI inference (open decision, F10).
- Any new vendor where the EU processing or DPA terms are not confirmed in the diff or an ADR.

## Check

- Terraform, compose and CI config: every Scaleway resource names an allowed region.
- Dependency changes: a new package that calls out to a non-EU service is flagged.
