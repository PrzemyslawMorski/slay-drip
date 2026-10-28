@S1-03
Feature: Local identity provider sign-in and admin acceptance tests
  As a considered dresser
  I want the sign-in and account-deletion behaviour of the local provider checked by executable tests
  So that the Session 1 sign-up and deletion work starts from scenarios that fail until the smoke script exists

  # Executable copy of the sign-in and admin scenarios in docs/specs/S1-03-local-keycloak.md (S1-03.07).
  # Keep the two in step. The smoke script makes the token, admin and registration calls. The test checks
  # its exit status and its final lines, and does not re-derive tokens. No browser is used.
  # The scenarios run in parallel (no serial mode): each script run creates its own throwaway user, and a
  # serial run would stop after the first failure, so the other scenarios would not report their own reason.

  @timeout:300000
  Scenario: A synthetic persona signs in with authorization code and PKCE S256
    Given the slay-drip realm is imported with the synthetic persona smoke.user@example.test
    When the smoke script runs the authorization code flow with PKCE S256 for client slay-drip-pwa
    Then the token endpoint returns an access token and an ID token
    And the access token audience includes slay-drip-api
    And the script ends with "OK: Keycloak smoke passed"

  @timeout:300000
  Scenario: The backend admin client can create, log out and delete a throwaway user
    Given client slay-drip-backend-admin is configured for client credentials
    When the smoke script gets a token, creates a throwaway synthetic user, revokes its sessions and deletes it
    Then the create, logout and delete calls return HTTP 201, 204 and 204
    And the throwaway user is no longer found afterwards

  @timeout:300000
  Scenario: Self-service registration is on in the local realm
    Given the committed realm file is infra/dev/keycloak/realm/slay-drip-realm.json
    When the smoke script reads that file
    Then registrationAllowed is true
    And the script reports this as a static check of the committed file
