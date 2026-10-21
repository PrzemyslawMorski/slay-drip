# Consent, retention and GDPR

Source: [CLAUDE.md](../../CLAUDE.md) "Hard rules", [security.md §1, §3, §14](../security.md#3-consent-and-retention) and [requirements.md "Privacy, GDPR & trust"](../requirements.md).

## Blocking when the diff

- A feature reads or writes body photos, measurements, wardrobe photos, or weather/location data without a server-side consent check for that data type. Hiding the UI is not a check.
- Consent is bundled: one toggle or one record covers more than one data type, or special-category fields are folded into general onboarding consent.
- Revoking consent stops using the data but does not delete it.
- A new personal data field, store or log path has no owner scoping, so user A can reach user B's data.
- A new personal data type is not covered by the account deletion or the data export (S7-01).
- Raw body photos are kept when the user's retention toggle is off.
- Special-category data (modesty rules, adaptive needs) is stored or sent to an AI model without its own explicit consent.

## Needs a decision (flag, do not decide)

- A new retention period. It must be written in the spec for that feature.
- Erasure window for backups (open decision).
- DPIA inputs for any new processing of body or special-category data.
- Whether to treat body photos as biometric. They are not used to identify anyone; a change that does is blocking (see product-guardrails.md).

## Check

- Each consent record stores a timestamp and the wording version the user saw.
- Deletion is wired to the consent switch in the same change, not left for later.
- Data subject requests outside the app are logged as requests, with no request content.
