# ADR-0012: MCP server on the Go API, using Streamable HTTP and the existing Keycloak bearer tokens

**Status:** Accepted
**Date:** 2026-11-02
**Deciders:** Outfit Planner team (decision taken by Przemysław Morski; defaults chosen for a pet project, product owner to confirm)
**Related:** [requirements](../requirements.md) (F7, F6), [S1-06](../specs/S1-06-mcp-server-access.md), [ADR-0010](0010-identity-provider-keycloak.md) (Keycloak and OIDC), [ADR-0007](0007-backend-go-and-test-stack.md) (Go backend), [ADR-0008](0008-postgresql-data-store-and-migrations.md) (PostgreSQL), [security guide](../security.md) (§5, §8, §10), [backend ruleset](../code-review/backend-ruleset.md) (BE-41, BE-47)

## Context

F7 makes the backend an MCP server, so an MCP-capable AI client can act on a signed-in person's wardrobe. Each new user-facing capability must also be exposed as an MCP tool (F7.4). Three things need a decision before code depends on them:

- **Transport.** The current MCP specification revision is 2026-07-28. Its transport is Streamable HTTP: one endpoint that accepts POST, with a JSON or SSE response per request. The older HTTP+SSE transport (2024-11-05) is deprecated and only kept for backward compatibility.
- **Authorisation.** The MCP authorisation specification treats an MCP server as an OAuth 2.1 resource server. It must publish Protected Resource Metadata (RFC 9728), and it must accept only access tokens issued for its own resource (RFC 8707 audience binding). Invalid tokens get HTTP 401.
- **SDK.** The official Go SDK is `github.com/modelcontextprotocol/go-sdk`, at v1.x. It provides `mcp.NewStreamableHTTPHandler`, `auth.RequireBearerToken`, and `auth.ProtectedResourceMetadataHandler`. For protocol version 2026-07-28 it requires stateless mode (`StreamableHTTPOptions.Stateless`), because the spec removed protocol-level sessions.

The backend already verifies RS256 bearer tokens against the Keycloak JWKS with issuer, audience and expiry checks (`backend/internal/auth`). It uses the standard library `net/http` `ServeMux` (`backend/internal/server/server.go`).

## Decision

We will mount the MCP server in the existing Go API at `/mcp`, using the official Go SDK's Streamable HTTP handler in **stateless** mode. Access is wrapped with `auth.RequireBearerToken`, whose verifier is the existing `auth.Verifier`. The API serves Protected Resource Metadata at `/.well-known/oauth-protected-resource`. Tokens come from the Keycloak realm in ADR-0010, through the existing public PWA client.

## Options considered

### Option A: Official Go SDK, Streamable HTTP, mounted in the API (chosen)

- Pros: the SDK is maintained alongside the spec, and the spec's transport and authorisation rules are built in. It reuses `auth.Verifier`, the router and the service layer, so there is one deployment, one auth path and one set of rules. Stateless mode suits Scaleway containers that may run more than one instance.
- Cons: the SDK's stateless mode is new and described as still being defined upstream. Older clients may not negotiate cleanly with it. Both need checking in the local run (see Revisit when).

### Option B: A separate MCP service in front of the API

- Pros: isolates MCP traffic and its dependencies.
- Cons: a second deployable, a second auth path that must stay identical to the first, and a network hop for every tool call. It duplicates the consent and owner-scope checks, which the rules say must live in one place.

### Option C: HTTP+SSE transport

- Pros: some older clients only speak it.
- Cons: deprecated by the spec. It needs two endpoints and long-lived connections, which fit serverless containers poorly.

### Option D: stdio transport

- Pros: simple for local tools.
- Cons: runs as a local process on the person's machine, so it cannot serve a hosted API with per-user tokens and the hosted data store.

## Defaults chosen

These were chosen to keep the pet project simple. Each one can change in a later ADR.

- **One resource, one audience.** The API is one OAuth resource. Its identifier is the canonical API URI (for example `https://<api host>`), and tokens for REST and MCP both carry it as `aud`. This replaces the current `OIDC_AUDIENCE=slay-drip-api` value, which is not a URI and so cannot satisfy RFC 8707 binding. The Keycloak audience mapper is changed in the same ticket. The new value is set through config, not code.
- **One Keycloak client.** MCP clients use the existing public client `slay-drip-pwa` with PKCE. A separate client per integration is not created now. Each MCP client's redirect URI is added to that client when that client first connects, not in advance.
- **Scopes.** Every tool requires the `mcp` scope, and each tool also needs the consent it touches (S1-06 tool table). Scope names are finalised with the first tool ticket.
- **Stateless.** No protocol session state. Any tool that needs state across calls takes an explicit server-minted ID as an argument, as the spec now recommends.
- **Test client.** The first local run uses an MCP-capable Claude client against the local stack with a synthetic persona (`*@example.test`).

## Consequences

- Positive: one deployable and one auth path. The MCP tools call the same service layer as the REST handlers, so consent and owner scope are written once. The endpoint follows the current spec and the SDK's canonical server pattern.
- Negative: the API's audience value changes, so existing REST tokens must be re-issued after the change. The SDK's stateless mode is new upstream, so pinning its version matters. Stateless mode rules out server-initiated requests such as sampling, which the tools do not need.
- Follow-up work (link specs or tasks):
  - Pin `github.com/modelcontextprotocol/go-sdk` in `backend/go.mod` in the first MCP ticket, with `govulncheck` clean.
  - Change `OIDC_AUDIENCE` to the API URI and add the Keycloak audience mapper. Update `docs/local-development.md` and `infra/dev/keycloak/realm/`.
  - Add `/.well-known/oauth-protected-resource` and `/mcp` to the router with tests for 401 responses and the `WWW-Authenticate` header.
  - Tool tickets under S1-06 as listed in its Design section.

## Compliance check

- [x] EU-only processing: the endpoint runs in the same Scaleway region as the API (`fr-par` default). No new vendor or hosted MCP registry.
- [x] Consent and retention impact: each tool checks the consent it touches. No new personal data store.
- [x] Special-category data impact: none in this ADR. Tools that touch modesty or adaptive-needs fields need their own review.
- [x] Hard constraints remain hard filters: not affected.
- [x] Test data is synthetic: local tests use `*@example.test` personas only.

## Amendment (2026-11-02): elicitation

Elicitation works with the stateless handler on protocol version 2026-07-28, through the Multi Round-Trip Requests pattern (SEP-2322). The Options and Consequences sections above said stateless mode rules out elicitation. That holds only for protocol versions before 2026-07-28, so this amendment corrects it.

- A tool that needs an answer returns an input request (`InputRequests`) with an opaque `RequestState` and no content. The client shows the question and calls the tool again with the answer. The Go SDK provides this pattern.
- `RequestState` carries no identity and no authorisation. The retry is a new authenticated request: the token check, owner scope and consent checks run again. If `RequestState` carries any state, it is signed and verified on the retry.
- Clients below 2026-07-28 cannot take elicitation in stateless mode. Those tools return an honest "more information needed" result and store nothing. Whether the SDK's legacy path works in stateless mode is not verified, and a spike must settle it before anything relies on it.
- Consent, the 18+ check and owner scope are never decided by an elicited answer. They run before any question is asked.
- Elicitation must not request passwords, secrets or payment details. Answers are personal data: a tool uses only what it needs and keeps them only as its spec says.

## Revisit when

- A target MCP client cannot negotiate with stateless mode. Then switch to the stateful handler on a single instance, and record the change in a new ADR.
- The product needs a server-initiated request on a protocol version before 2026-07-28 (for example sampling, or elicitation for older clients). Stateless mode rules that out, so it would need a stateful handler.
- Keycloak cannot issue tokens whose `aud` matches the API URI on the Scaleway deployment (ADR-0010 spike).
