# S1-04 · Server-side 18+ gate at sign-up

| Field | Value |
| --- | --- |
| **Key** | S1-04 |
| **Issue type** | Story |
| **Priority** | Highest (repo backlog: P0). Blocks any real user sign-up. |
| **Status** | To Do |
| **Epic** | S1 · Walking skeleton |
| **Components** | server, client, infra |
| **Labels** | gdpr, security, hard-rule, open-decision |
| **Story points** | 3 |
| **Sprint / Fix version** | Session 1 |
| **Reporter** | Przemysław Morski |
| **Assignee** | Unassigned |

## User story

Requirement served: F1.1 (18+ gate at sign-up) and the hard rule "18+ only, enforced at sign-up" in [requirements](../requirements.md) and [CLAUDE.md](../../CLAUDE.md).

```gherkin
Feature: Server-side 18+ gate at sign-up
  As a considered dresser
  I want sign-up to refuse anyone under 18 on the server, not only in the app
  So that no under-18 person gets an account or any personal data stored
```

Today the only age check is the client-side `AgeGate` in the PWA (S1-01). It is a user-experience check, not a control ([security guide §2](../security.md#2-age-gate-18)). Keycloak (ADR-0010) holds no age attribute, so the Go API cannot tell whether a new account passed the gate. The local realm enables self-service registration (S1-03), which makes this gap reachable in development. The gap must close before any real user signs up, and before any deployment outside a developer machine.

Scope of this ticket is the enforcement path only. Whether age is stored at all, and how age is verified, are open decisions for the DPO (see Notes). They are not decided here.

## Acceptance criteria

```gherkin
Scenario: The API refuses a sign-up that is not confirmed as 18 or over
  Given the local identity provider is running with self-service registration on
  When a sign-up completes without the server-side 18+ confirmation
  Then the account is not usable for any API route
  And the API answers 403 with error "age_gate_required" on the first call to a user route

Scenario: An under-18 sign-up is refused by calling the API directly
  Given a request to the sign-up confirmation endpoint declares an age under 18
  When the request is sent without going through the PWA
  Then the API answers 403 with error "age_gate_failed"
  And no user row, consent row or wardrobe row is written for that subject
  And the declared age is not written to logs or to any table

Scenario: An adult sign-up is confirmed once and then accepted on user routes
  Given a newly registered user holds a verified access token
  When the user confirms 18 or over through the sign-up confirmation endpoint
  Then the API records the confirmation for that subject only
  And later requests with the same token pass the gate
  And the confirmation cannot be replaced by a field in a later request body

Scenario: The age check is not trusted from the client's later requests
  Given a user has a verified token and no recorded confirmation
  When the user sends a request to a user route with a body field "age" or "over18" set to true
  Then the API ignores the field
  And answers 403 with error "age_gate_required"

Scenario: The local stack proves the gate end to end
  Given the local stack is running with docker compose
  When the sign-up smoke check runs with one adult and one under-18 test persona
  Then the adult passes and the under-18 is refused
  And the check ends with "OK: 18+ gate passed"
```

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | S1-03 | In progress | Keycloak realm, token verification and registration must exist first. |
| is blocked by | DPO decision on age storage | Open | Decides what the confirmation records (a flag, or a date of birth). |
| relates to | S1-01 | To Do | The client-side `AgeGate` stays as UX and is not the control. |
| relates to | S1-03.12 | To Do | The hard-rule probe list must cover any new user route. |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with the repo's checks passing.
- [ ] Tests added or updated alongside the changed code, including an under-18 test that calls the API directly (BE-49).
- [ ] Quality and compliance checked: DPO sign-off on what is stored, recorded in the PR.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or ticket status), if behaviour changed.

## Notes

**Open decisions (flag, do not decide):**

- **Whether age is stored at all, and in what form.** A boolean "18 or over, confirmed on this date" is the minimum. A date of birth needs a documented DPO reason ([security guide §2](../security.md#2-age-gate-18); [age gate ruleset](../code-review/age-gate.md)).
- **How the 18+ fact is established.** A self-declared check is what the UI does today. Stronger verification is a product and legal choice and is not in scope here. Record which method is used in the ADR that this ticket writes.
- **Where the confirmation lives.** Options: a Keycloak user attribute written by the API through the admin client (ADR-0010 follow-up), or a row in our PostgreSQL database (ADR-0010 says application data stays in PostgreSQL, and the identity provider holds minimal account data). The second fits ADR-0010 better. Confirm before building.

**Agent brief (for the executor, once the open decisions are settled):**

- **Role:** `backend-engineer` for the API gate and tests; `frontend-engineer` for the sign-up step that calls the endpoint; `infra-engineer` for the local smoke check.
- **Read first:** [security guide §2](../security.md#2-age-gate-18), [age gate ruleset](../code-review/age-gate.md), [ADR-0010](../adr/0010-identity-provider-keycloak.md), [S1-03](S1-03-local-keycloak.md).
- **Constraints:** EU-only. No AWS SDK or CLI. Synthetic personas only (`example.test`). Never store or log the rejected age. Never read, print or create `.env` files.
- **Depends on code from:** the token verification and the wardrobe API branch (`feat/wardrobe-api`) and the Keycloak branch (`feat/local-keycloak`). Land those first.

**Related:** the 18+ gate for the wardrobe is a sign-up gate only. Consent is a separate, granular check (security guide §3) and is not covered here.
