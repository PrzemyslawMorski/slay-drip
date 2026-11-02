# S1-06 · Expose the backend as an MCP server

**Status:** Ready
**Slice:** Session 1, now (MCP is an MVP capability, see F7) · **Priority:** P1
**Depends on:** [S1-07](S1-07-containerised-dev-tooling.md) (containerised development tooling, a blocker: S1-06 does not start until S1-07 is Done), S1-03 (local Keycloak), S1-04 (server-side 18+ gate), S1-05 (rate limiting), server-side wardrobe for signed-in users (commit f5fb22c), S1-02 (outfit creation, for `outfit_create`)
**Related:** [requirements](../requirements.md) (F7, F6, Privacy §4, §6, §9), [ADR-0012](../adr/0012-mcp-server-transport-and-auth.md) (transport and auth), [ADR-0010](../adr/0010-identity-provider-keycloak.md), [security guide](../security.md) (§2, §5, §8, §10), [backend ruleset](../code-review/backend-ruleset.md) (BE-35, BE-41, BE-47, BE-49), [ADR-0005](../adr/0005-local-cloud-emulation.md), [ADR-0006](../adr/0006-development-feedback-loops-ports-and-fakes.md)

## Problem

An AI client that a person already uses (Claude, for example) cannot act on their wardrobe today. The person has to switch to the app for every upload and outfit. F7 asks for the backend to expose its wardrobe and outfit actions as an MCP server, so the same actions work from an MCP-capable client, under the same identity and rules as the app. MCP is first-class: this spec also sets up the pattern that every later capability follows.

## Goals

- An MCP-capable client can, for a signed-in person, upload a wardrobe image, list their wardrobe, create an outfit from their own items and list saved outfits.
- Each tool call runs as the token's subject (`sub`). It cannot reach another person's data.
- The MCP surface reuses the existing backend services. Business logic is not copied into the MCP layer.
- A checklist exists for adding a tool, so new features can add theirs in the same change (F7.4).

## Non-goals

- Outfit generation with weather and AI ranking (F3). Add it as a tool only after the feature exists.
- Anonymous MCP access. Every call needs a verified token.
- A public, unauthenticated MCP registry or discovery listing.
- Destructive tools (delete, export). They wait for a later spec with their own confirmation design.
- Any MCP client-side work, such as a Claude connector configuration in the app.

## Scope

- An MCP endpoint at `/mcp` in the Go API (`backend/`), using the official Go SDK in stateless Streamable HTTP mode (ADR-0012).
- Protected Resource Metadata at `/.well-known/oauth-protected-resource`.
- The first tool set listed in Design. Every other action waits for its own ticket.
- Tool results that describe items and outfits in a form the model can use, without personal data beyond what the tool needs (security guide §8).
- Local run against the Keycloak stand-in (`compose.yaml`), with the same config keys as production (ADR-0005).
- Proposed, not yet in requirements.md (F7.5): a tool may ask the person for a missing detail through the client, under the rules in ADR-0012's elicitation amendment.

## Design

**Shape.** The MCP layer is a thin adapter. Each tool validates its input, calls the same wardrobe or outfit service the HTTP handlers call, and maps the result to a tool response. The HTTP handlers and the MCP tools share the service layer, so a rule such as the owner scope or the consent check is written once.

**Transport and routing (ADR-0012).** `mcp.NewStreamableHTTPHandler` with `Stateless: true`, mounted on the existing `ServeMux` at `/mcp`. It is wrapped by `auth.RequireBearerToken`, whose verifier is the existing `auth.Verifier`.

**Authentication (reuses ADR-0010).**

- The MCP client obtains an access token from Keycloak through the `slay-drip-pwa` public client with PKCE, with the person signed in.
- The token's audience is the API's canonical URI (ADR-0012). REST and MCP use the same resource, so the audience change lands once, for both.
- The verifier checks RS256 only, issuer, audience, expiry, and takes `sub` from the verified token.
- No tool reads the person's ID from its arguments.
- Token-based auth only. No session cookies on the MCP endpoint.

**Tool set (defaults chosen).**

| Tool | Purpose | Consent it needs |
| --- | --- | --- |
| `wardrobe_upload_image` | Add a single item from an uploaded image; takes an optional `category` and asks for it through elicitation when missing (proposed) | Wardrobe photos |
| `wardrobe_list_items` | List the person's items with their state | Wardrobe photos |
| `outfit_create` | Save a named outfit made from the person's own item IDs | Wardrobe photos (S1-02) |
| `outfit_list` | List the person's saved outfits, with names and item IDs | Wardrobe photos |

Each tool requires the `mcp` scope. Scope names are finalised in the first tool ticket.

**Adding a tool (checklist for every later feature).** A new capability's spec names its MCP tools, and the change includes:

1. The tool calls the service layer, not a copy of its logic.
2. The tool's consent and owner-scope checks run through the same code as the HTTP route.
3. A test calls the tool with another person's ID and expects "not found".
4. A test calls the tool without consent and expects a refusal that names the consent.
5. The tool is listed in the spec's tool table and in the local-run section of the PR.

**Elicitation (proposed; ADR-0012 amendment).** A tool may ask the person for a missing detail through the client, using the request-and-retry pattern in the ADR. Clients on protocol 2026-07-28 receive the question. Older clients get an honest "more information needed" result, and nothing is stored. Elicitation never grants consent and never replaces the 18+ check. The first use is `wardrobe_upload_image` asking for a category when the request does not include one. The sample client that shows the pattern lives in `examples/mcp-elicitation/` (Python, standard library only), owned by backend-engineer. It is not part of the Go API. It is not built yet: it needs its own acceptance scenario, and F7.5 must be approved first.

**Data and storage.** No new personal data store. Wardrobe images and outfits go through the existing server-side wardrobe storage and its S3-compatible object store (ADR-0005). The MCP layer keeps no state between calls.

**Limits.** Rate limits per account on every tool, using the S1-05 limiter. Request size limits on upload match the HTTP limits (`MaxRequestBodyBytes` in the SDK's options is set to the same value).

**Logging.** Log tool name, outcome and latency. Never log tokens, the authorisation header, image bytes, item names or tool arguments (BE-35).

**Errors.** An unverified token returns 401 with a `WWW-Authenticate` header and no detail. A tool error for a missing or foreign item says "not found", not "forbidden", so one person cannot probe another's IDs.

## Acceptance criteria

```gherkin
Feature: Backend exposed as an MCP server
  As a considered dresser
  I want my AI client to act on my wardrobe for me
  So that I can add items and save outfits without switching to the app

  Scenario: A signed-in person uploads an item through an MCP client
    Given a person is signed in and their client holds a valid access token
    When the client calls "wardrobe_upload_image" with a JPEG
    Then the item is stored under that person's account
    And the response contains the new item's ID

  Scenario: A request without a valid token is refused
    Given no token, an expired token, or a token for another audience
    When the client calls any MCP tool
    Then the call returns 401 with a WWW-Authenticate header and no detail about why it failed

  Scenario: Protected Resource Metadata is published
    Given an MCP client that has no token
    When it requests the protected resource metadata
    Then the response names the API resource and its authorization server

  Scenario: A person cannot act on another person's items
    Given person A owns an item and person B is signed in
    When person B calls "outfit_create" with A's item ID
    Then the call returns "not found"
    And no outfit is saved

  Scenario: The person's ID comes only from the token
    Given a tool call whose arguments include a different user ID
    When the call is made
    Then the argument is ignored and the token's subject is used

  Scenario: A person without wardrobe consent is refused
    Given a signed-in person who has not consented to wardrobe photos
    When the client calls "wardrobe_upload_image"
    Then the call is refused with a message that names the missing consent

  Scenario: A person under 18 cannot use the endpoint
    Given an account that failed the 18+ gate
    When the client calls any MCP tool
    Then the call is refused

  Scenario: Excess calls are rate-limited
    Given a signed-in person who has reached the per-account limit
    When the client calls any tool again
    Then the call returns a rate-limit response and no work is done

  Scenario: Tool output does not carry more personal data than the tool needs
    Given a person with items that have names and notes
    When the client calls "wardrobe_list_items"
    Then the response contains only the fields listed for that tool

  Scenario: The tool asks for a missing detail instead of guessing
    Given a signed-in person with wardrobe consent, and a client that supports elicitation
    When the client calls "wardrobe_upload_image" without a category
    Then the server asks the person for the category before it stores the item
    And the item is stored with the category the person chose

  Scenario: A client without elicitation gets an honest request for more information
    Given a signed-in person with wardrobe consent, and a client that does not support elicitation
    When the client calls "wardrobe_upload_image" without a category
    Then the call returns a result that says a category is needed
    And no item is stored

  Scenario: An elicitation answer cannot grant consent
    Given a signed-in person who has not consented to wardrobe photos
    When the client calls "wardrobe_upload_image" without a category
    Then the call is refused before any question is asked

  Scenario: A signed-in person uploads sample items, creates an outfit and views it
    Given a signed-in synthetic persona with wardrobe consent and an empty wardrobe
    When the client uploads three sample items, answering the category question if it is asked, and then creates a named outfit from two of them
    Then each upload returns the new item's ID
    And the outfit is saved with the name and the two chosen item IDs
    And listing the outfits shows that outfit with its name and those item IDs
```

## Quality and compliance

- AI quality bar: not applicable in this spec. The MCP layer runs no model. Tools that later call AI inference need their own spec and evals.
- Hard constraints that must hold 100% of the time: auth on every tool, owner scope on every query, and the 18+ and consent checks. These are checked automatically by the tests in Test plan.
- Consent, retention and EU-only impact: the endpoint runs on Scaleway in the region set for the API (`fr-par` default). It processes wardrobe photos, so it is covered by the wardrobe consent. Revoking that consent blocks the tools that need it, and deletion follows the F6 path. No new vendor, and no third-party MCP host.
- Accessibility (WCAG 2.1 AA) impact: not applicable. No UI in this spec.
- Special-category data: none expected from these tools. Confirm before any tool handles modesty or adaptive-needs fields.

## Test plan

- Unit / integration: each tool through the service fakes (ADR-0006 inner loop). Table tests for the cross-user, missing-consent, under-18 and rate-limit scenarios. Token verification tests reuse `backend/internal/auth/authtest`. Router tests for `/mcp` and the metadata path, in the same style as `wardrobe_routes_test.go`.
- Evals or golden-set checks: not applicable.
- Manual or device checks: a local run against the local stack: Keycloak, PostgreSQL and the S3 stand-in (`docs/local-development.md`). Connect one MCP-capable Claude client with a synthetic persona (`*@example.test`), and show upload, list and outfit save. Check that the client negotiates the protocol version with the stateless handler. The PR shows the run.

## Risks and open questions

| Risk or question | Impact | Owner | Mitigation |
| --- | --- | --- | --- |
| Stateless mode and older MCP clients | A client may fail to negotiate | Backend | Verified in the local run. If it fails, switch to the stateful handler on one instance (ADR-0012 revisit) |
| Keycloak audience mapper and REST token re-issue | Existing tokens stop working after the audience change | Backend | Change in one ticket with the mapper and config docs; re-sign-in is expected for the pilot |
| Redirect URI for an MCP client on the shared `slay-drip-pwa` client | The client cannot sign in until its redirect URI is added | Backend | Add it when the first client connects (ADR-0012 default). Not pre-emptive |
| A tool leaks another person's data through an ID probe | Trust and GDPR breach | Backend | Owner scope in the service layer; "not found" errors; cross-user tests |
| The model sees more data than it needs | Privacy | Backend and AI | Minimal tool output; security guide §8 |
| Prompt-injected tool calls delete or export data | Data loss | Backend | Destructive actions stay out of the first tool set; confirmation in the client is not a server control |
| `outfit_list` has no scenario of its own | Covered only inside the sample journey scenario | Spec owner | Add a dedicated scenario if the list needs its own rules (for example ordering) |
| Sample journey depends on the outfit store, which waits on ADR-0013 | The journey cannot run until a person accepts the ADR | Architect | S1-06.13 and S1-06.14 stay Blocked. The sample journey and S1-06.21 wait with them |
| Sample items are PNG, but the upload scenario says JPEG | The format the tool accepts is not settled in the spec | Spec owner | Name the accepted formats in the spec before S1-06.09 is built |
| Sample images are OpenRAIL, development-only, and some show brand logos | Licence and logo rules; product use is not allowed | Product owner and privacy reviewer | Keep them in `_samples/`. Do not copy them into `examples/` or product assets. The privacy review checks the logos |
| `wardrobe_list_items` has no field list | The output-minimisation scenario cannot be written precisely | Spec owner | List the fields in Design (Tool set). S1-06.10 is Blocked until then |
| Server-side outfits for signed-in people need a new store | Personal data in a new place | Architect | Spike S1-06.01 writes ADR-0013 as Proposed. A person accepts it, then S1-06.13 and S1-06.14 start |
| Elicitation on clients below 2026-07-28, and the SDK's legacy path in stateless mode | The question never reaches the person | Backend | Spike before the first elicitation ticket. Until then the honest fallback result applies |
| Elicitation not yet in requirements.md (F7.5) | A capability ships without an approved requirement | Product owner | Approve the proposed F7.5 wording before any elicitation ticket is cut |
| Elicited answers are personal data | Privacy | Privacy reviewer | The category is the only answer the spec keeps. Review before any second use |

## Tickets

Breakdown from [tickets-from-spec](../../.claude/skills/tickets-from-spec/SKILL.md). Waves are computed over blockers inside this batch. External blockers are listed in each ticket's Dependencies.

| Key | Ticket | Role | Wave | Status | Blocked by |
| --- | --- | --- | --- | --- | --- |
| S1-06.01 | [Propose server-side outfits decision (ADR-0013)](S1-06.01-propose-server-side-outfits-adr.md) | architect | 1 | To Do | None |
| S1-06.02 | [Keycloak audience mapper for the API URI](S1-06.02-keycloak-audience-mapper-api-uri.md) | infra-engineer | 1 | To Do | S1-03 (external) |
| S1-06.03 | [Red acceptance: auth surface](S1-06.03-red-acceptance-auth-surface.md) | acceptance-author | 1 | To Do | None |
| S1-06.04 | [Red acceptance: upload and identity](S1-06.04-red-acceptance-wardrobe-upload-and-identity.md) | acceptance-author | 2 | To Do | S1-06.03, S1-03 (external) |
| S1-06.05 | [Red acceptance: consent and age gate](S1-06.05-red-acceptance-consent-and-age-gate.md) | acceptance-author | 2 | To Do | S1-06.03, S1-04 (external) |
| S1-06.06 | [Red acceptance: rate limit and output](S1-06.06-red-acceptance-rate-limit-and-output.md) | acceptance-author | 2 | To Do | S1-06.03 |
| S1-06.07 | [Red acceptance: cross-user outfits](S1-06.07-red-acceptance-cross-user-outfits.md) | acceptance-author | 2 | To Do | S1-06.03 |
| S1-06.08 | [MCP endpoint and protected resource metadata](S1-06.08-mcp-endpoint-and-protected-resource-metadata.md) | backend-engineer | 2 | To Do | S1-06.03 |
| S1-06.09 | [MCP tool: wardrobe_upload_image](S1-06.09-wardrobe-upload-image-tool.md) | backend-engineer | 4 | To Do | S1-06.04, S1-06.08, S1-06.11 |
| S1-06.10 | [MCP tool: wardrobe_list_items](S1-06.10-wardrobe-list-items-tool.md) | backend-engineer | 4 | Blocked | S1-06.06, S1-06.08, S1-06.11 |
| S1-06.11 | [Consent and 18+ gate for MCP tools](S1-06.11-consent-and-age-gate-for-mcp-tools.md) | backend-engineer | 3 | To Do | S1-06.05, S1-06.08, S1-04 (external) |
| S1-06.12 | [Rate limit MCP tool calls](S1-06.12-rate-limit-mcp-tool-calls.md) | backend-engineer | 3 | To Do | S1-06.06, S1-06.08, S1-05 (external) |
| S1-06.13 | [Server-side outfits store in PostgreSQL](S1-06.13-outfits-store-postgresql.md) | data-engineer | 2 | Blocked | S1-06.01 |
| S1-06.14 | [MCP tool: outfit_create](S1-06.14-outfit-create-tool.md) | backend-engineer | 3 | Blocked | S1-06.07, S1-06.08, S1-06.13 |
| S1-06.15 | [Privacy review: MCP access](S1-06.15-privacy-review-mcp-access.md) | privacy-reviewer | 7 | To Do | S1-06.02, S1-06.09, S1-06.10, S1-06.11, S1-06.12, S1-06.14, S1-06.19, S1-06.22 |
| S1-06.16 | [Close S1-06: spec status and ticket table](S1-06.16-close-s1-06-spec.md) | docs-steward | 8 | To Do | S1-06.15 |
| S1-06.17 | [Spike: elicitation on the stateless handler](S1-06.17-spike-elicitation-on-stateless-handler.md) | architect | 1 | To Do | None |
| S1-06.18 | [Red acceptance: elicitation](S1-06.18-red-acceptance-elicitation.md) | acceptance-author | 2 | To Do | S1-06.03 |
| S1-06.19 | [MCP tool: wardrobe_upload_image elicits a missing category](S1-06.19-upload-tool-elicitation-for-category.md) | backend-engineer | 5 | Blocked | S1-06.09, S1-06.11, S1-06.17, S1-06.18 |
| S1-06.20 | [Red acceptance: sample journey](S1-06.20-red-acceptance-sample-journey.md) | acceptance-author | 2 | To Do | S1-06.03 |
| S1-06.21 | [MCP tool: outfit_list](S1-06.21-outfit-list-tool.md) | backend-engineer | 4 | Blocked | S1-06.08, S1-06.11, S1-06.13, S1-06.20 |
| S1-06.22 | [Sample client: the typical journey, with elicitation](S1-06.22-sample-client-elicitation-journey.md) | backend-engineer | 6 | Blocked | S1-06.09, S1-06.14, S1-06.17, S1-06.19, S1-06.21 |
