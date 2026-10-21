# Age gate (18+)

Source: [CLAUDE.md](../../CLAUDE.md) "Hard rules" and [security.md §2](../security.md#2-age-gate-18).

## Blocking when the diff

- Sign-up accepts an under-18 user, or the 18+ check exists only in the client.
- The API accepts a sign-up request that skips the age check, for example by omitting the age field.
- A rejected user gets an account, a row, or any personal data written. The rejected age must not be stored.
- A date of birth is stored without a documented reason from the DPO. Store the minimum needed to show the check passed.
- Age is taken from a client-controlled field in a later request instead of the verified sign-up result.

## Needs a decision (flag, do not decide)

- Whether age is stored at all (open decision, DPO review).

## Check

- Tests: an under-18 sign-up is rejected by calling the API directly, not through the UI.
- Any new sign-up path, including invitations, SSO or test helpers, passes through the same server-side gate.
