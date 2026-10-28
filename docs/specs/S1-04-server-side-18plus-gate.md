# S1-04 · Server-side 18+ self-declaration at sign-up

| Field | Value |
| --- | --- |
| **Key** | S1-04 |
| **Issue type** | Story |
| **Priority** | Highest (repo backlog: P0). Blocks any real user sign-up. |
| **Status** | To Do |
| **Epic** | S1 · Walking skeleton |
| **Components** | server, client, infra |
| **Labels** | gdpr, security, hard-rule |
| **Story points** | 3 |
| **Sprint / Fix version** | Session 1 |
| **Reporter** | Przemysław Morski |
| **Assignee** | Unassigned |

## User story

Requirement served: F1.1 (18+ gate at sign-up) and the hard rule "18+ only, enforced at sign-up" in [requirements](../requirements.md) and [CLAUDE.md](../../CLAUDE.md).

```gherkin
Feature: Server-side 18+ self-declaration at sign-up
  As a considered dresser
  I want sign-up to refuse anyone who does not commit to being 18 or over, on the server and not only in the app
  So that no under-18 person keeps an account or has any personal data stored
```

Today the only age check is the client-side `AgeGate` in the PWA (S1-01). It is a user-experience check, not a control ([security guide §2](../security.md#2-age-gate-18)). Keycloak (ADR-0010) holds no age attribute, so the API cannot tell whether a new account made the declaration. The local realm enables self-service registration (S1-03), which makes this gap reachable in development.

**Decided (product owner):**

- Age is **not stored**. No date of birth, no age, no birth year.
- What is stored is only the **fact** that the user declared, by self-declaration, that they are 18 or over: one boolean.
- The boolean lives as a **Keycloak user attribute**, not in our PostgreSQL database.

This is a self-declaration, not verification. That is what the product owner chose. The ticket does not change the wording of the UI check.

## Acceptance criteria

```gherkin
Scenario: A new account is not usable until the user declares 18 or over
  Given the local identity provider is running with self-service registration on
  And a user has just registered and holds a verified access token
  And no 18+ declaration is recorded for that user
  When the user calls a user route
  Then the API answers 403 with error "age_declaration_required"
  And no wardrobe, consent or outfit data is returned or written

Scenario: An adult declares 18 or over and the declaration is recorded once
  Given a newly registered user holds a verified access token
  When the user declares that they are 18 or over
  Then the API sets the Keycloak user attribute "over18_declared" to "true" for that subject
  And no date of birth, age or birth year is written anywhere
  And later requests with the same token pass the gate

Scenario: An under-18 declaration is refused and the account is removed
  Given a newly registered user holds a verified access token
  When the user declares that they are under 18
  Then the API answers 403 with error "age_declaration_failed"
  And the API deletes the Keycloak user for that subject through the admin client
  And no wardrobe, consent or outfit row is written for that subject
  And the declaration is not written to logs or to any table

Scenario: A declaration sent in a later request body is not trusted
  Given a user has a verified token and no "over18_declared" attribute
  When the user sends a request to a user route with a body field "over18" or "age" set to true
  Then the API ignores the field
  And answers 403 with error "age_declaration_required"

Scenario: The attribute cannot be changed by the user in the account console
  Given the slay-drip realm is imported
  When a user edits their own account in the Keycloak account console
  Then the user cannot change "over18_declared"

Scenario: The local stack proves the gate end to end
  Given the local stack is running with docker compose
  When the sign-up smoke check runs with one adult and one under-18 test persona
  Then the adult passes and the under-18 is refused and deleted
  And the check ends with "OK: 18+ self-declaration passed"
```

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | S1-03 | In progress | Keycloak realm, token verification, the admin client and registration must exist first. |
| relates to | S1-01 | To Do | The client-side `AgeGate` stays as UX and is not the control. |
| relates to | S1-03.12 | To Do | The hard-rule probe list must cover the new declaration route. |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with the repo's checks passing.
- [ ] Tests added or updated alongside the changed code, including an under-18 test that calls the API directly (BE-49).
- [ ] Quality and compliance checked: the PR records that only the boolean is stored and that no age is stored anywhere.
- [ ] Accessibility checked against WCAG 2.1 AA, if the ticket changes UI.
- [ ] Docs updated (spec, ADR or ticket status), if behaviour changed. The ADR-0010 follow-up and the security guide §2 note on storage must match this ticket.

## Notes

**Open for the DPO (not decided here):** the security guide §2 says to store the minimum and to confirm with the DPO before keeping any date of birth. The product owner has chosen the boolean only. The DPO should still confirm that a self-declared boolean is an acceptable minimum for the 18+ check. Record the answer in the PR.

**Known limit:** self-declaration does not prove age. The product owner accepted this. Stronger verification is a separate product and legal choice and is not in scope.

**Agent brief (for the executor):**

- **Role:** `backend-engineer` for the declaration route, the attribute write and the under-18 deletion; `frontend-engineer` for the declaration step after registration; `infra-engineer` for the realm attribute setting and the smoke check.
- **Realm:** declare `over18_declared` as a user-profile attribute that the user cannot edit (Keycloak user profile, admin-only write). The backend admin client sets it through the Admin API. The admin client needs `manage-users`, which S1-03 already grants. Confirm the attribute is not writable from the account console.
- **Under-18 path:** the API deletes the Keycloak user through the admin client before it answers. If the delete fails, the API must not answer success and must log the failure without the declaration or any personal data.
- **Read first:** [security guide §2](../security.md#2-age-gate-18), [age gate ruleset](../code-review/age-gate.md), [ADR-0010](../adr/0010-identity-provider-keycloak.md), [S1-03](S1-03-local-keycloak.md).
- **Constraints:** EU-only. No AWS SDK or CLI. Synthetic personas only (`example.test`). Never store, log or print the declared age. Never read, print or create `.env` files.
- **Depends on code from:** `feat/wardrobe-api` (token verification) and `feat/local-keycloak` (realm and admin client). Land those first.

**Related:** the wardrobe and consent checks are separate (security guide §3) and are not covered here.
