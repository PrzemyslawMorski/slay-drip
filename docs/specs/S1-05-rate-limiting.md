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

## Tickets

Breakdown from [tickets-from-spec](../../.claude/skills/tickets-from-spec/SKILL.md). Waves are computed over blockers inside this batch.

| Key | Ticket | Role | Wave | Status | Blocked by |
| --- | --- | --- | --- | --- | --- |
| S1-05.01 | [Red acceptance: refusal above the limit and per-account limits](S1-05.01-red-acceptance-limit-and-account-isolation.md) | acceptance-author | 1 | To Do | None |
| S1-05.02 | [Red acceptance: window reset and refusal before the limiter](S1-05.02-red-acceptance-window-reset-and-auth-first.md) | acceptance-author | 1 | To Do | None |
| S1-05.03 | [Red acceptance: rate-limited routes are listed and tested](S1-05.03-red-acceptance-rate-limited-route-list.md) | acceptance-author | 1 | To Do | None |
| S1-05.04 | [Rate limiter port with an in-process fixed window](S1-05.04-rate-limiter-port-and-fixed-window.md) | backend-engineer | 2 | To Do | S1-05.01, S1-05.02 |
| S1-05.05 | [Rate-limit middleware: 429 with Retry-After, and per-account limits](S1-05.05-rate-limit-middleware-429-and-refusal.md) | backend-engineer | 3 | To Do | S1-05.01, S1-05.04 |
| S1-05.06 | [Rate-limit window reset, and 401 before the limiter](S1-05.06-rate-limit-window-reset-and-auth-order.md) | backend-engineer | 4 | To Do | S1-05.02, S1-05.04, S1-05.05 |
| S1-05.07 | [Mark rate-limited routes and test the list](S1-05.07-mark-rate-limited-routes-and-list-test.md) | backend-engineer | 5 | To Do | S1-05.03, S1-05.06 |
| S1-05.08 | [Privacy review: rate limiting and its logs](S1-05.08-privacy-review-rate-limiting.md) | privacy-reviewer | 6 | To Do | S1-05.04, S1-05.05, S1-05.06, S1-05.07 |
| S1-05.09 | [Close S1-05: spec status and single-instance follow-up](S1-05.09-close-s1-05-spec.md) | docs-steward | 7 | To Do | S1-05.08 |
