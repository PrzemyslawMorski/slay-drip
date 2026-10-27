@S1-03 @mode:serial
Feature: Local identity provider stack acceptance tests
  As a considered dresser
  I want the local identity provider's start-up and discovery behaviour checked by executable tests
  So that the S1-03.01 service and realm are built against scenarios that fail until they exist

  # Executable copy of the stack and discovery scenarios in docs/specs/S1-03-local-keycloak.md (S1-03.06).
  # Keep the two in step. The scenarios share one local stack, so they run in order (serial mode).
  # No browser is used: HTTP goes through the Playwright request API and docker compose runs as a child process.

  @timeout:900000
  Scenario: The local identity provider starts beside PostgreSQL and the S3 stand-in
    Given the local stack is stopped
    When I run "docker compose up -d" from the repo root
    Then the keycloak service is running and reports healthy
    And keycloak listens on 127.0.0.1 only
    And the database and object-storage services are still running
    And keycloak has no named volume

  @timeout:300000
  Scenario: The local identity provider publishes its discovery document and keys
    Given the keycloak service is healthy
    When I request the discovery document and the JWKS URL from the config contract
    Then both respond with HTTP 200
    And the discovery issuer equals the value of OIDC_ISSUER_URL
    And the discovery document gives the JWKS URL equal to OIDC_JWKS_URL
    And the discovery document lists S256 as a supported code challenge method

  @timeout:300000
  Scenario: The PWA client refuses sign-in without a PKCE S256 challenge
    Given the slay-drip realm is imported
    When an authorization request for client slay-drip-pwa arrives without a code challenge
    Then the request is refused and no login form is shown
    And the redirect URIs of slay-drip-pwa list only paths on http://localhost:5173
