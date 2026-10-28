# S1-05 · Rate limiting on authenticated and AI-backed routes

| Field | Value |
| --- | --- |
| **Key** | S1-05 |
| **Issue type** | Story |
| **Priority** | High (repo backlog: P1) |
| **Status** | To Do |
| **Epic** | S1 · Walking skeleton |
| **Components** | server, infra |
| **Labels** | security, hard-rule |
| **Story points** | 3 |
| **Sprint / Fix version** | Session 1 |
| **Reporter** | Przemysław Morski |
| **Assignee** | Unassigned |

## User story

Requirement served: security guide §10 (rate-limit authentication and AI-backed endpoints) and BE-47 (blocking).

```gherkin
Feature: Rate limiting on account and wardrobe routes
  As a considered dresser
  I want the service to refuse bursts of requests from one account
  So that one account or a script cannot exhaust the service or its storage
```

## Acceptance criteria

```gherkin
Scenario: A user route refuses requests above the limit for one account
  Given a verified user has made the allowed number of requests in the window
  When the user makes one more request to a rate-limited route
  Then the API answers 429
  And the response has a Retry-After header in seconds
  And the response body has error "rate_limited"

Scenario: The limit is per account, not shared between accounts
  Given user A has reached the limit
  When user B makes a request to the same route
  Then the API answers with the normal response for user B

Scenario: The limit resets after the window
  Given a verified user has reached the limit
  When the window has passed
  Then the user's next request is accepted

Scenario: Unauthenticated requests are refused before the limiter is consulted
  Given a request has no verified token
  When it is sent to a rate-limited route
  Then the API answers 401
  And the limiter's counter is not changed

Scenario: Rate-limited routes are listed and tested
  Given the router is built
  When the rate-limit route list is compared with the routes marked rate-limited in code
  Then every route that consumes a consent, upload or declaration is listed
```

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | feat/wardrobe-api (token verification) | In review | Limits are per verified subject. |
| relates to | S1-04.01 | To Do | The declaration route is rate-limited too. |
| relates to | ADR-0006 | Accepted | Use a port with a fake, so the limiter has a contract test. |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with the repo's checks passing.
- [ ] Tests use an injected clock, not sleeps (BE-28); the limiter has a fake and a contract test (BE-22).
- [ ] Config keys for limit and window documented in the local development guide with local values.
- [ ] The PR records the single-instance limit (see Notes) and links a follow-up if the service runs more than one instance.

## Notes

- **Role:** `backend-engineer`. Design choice: an in-process fixed-window or token-bucket limiter behind a port. It counts per instance, so with several instances the effective limit is higher. A shared store (for example Valkey on Scaleway) would need its own ADR, so it is not decided here.
- **AI-backed routes:** none exist yet. When one is added, it must join the same list.
- **Logging:** log the route category and the count only, never the subject identifier.
