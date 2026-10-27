@S1-03
Feature: Local identity provider documentation acceptance test
  As a considered dresser
  I want the local guide's Keycloak section checked by an executable test
  So that the developer run steps are known to exist before the guide is trusted

  # Executable copy of the docs scenario in docs/specs/S1-03-local-keycloak.md (S1-03.08).
  # Keep the two in step. The steps read docs/local-development.md as text and check that the content is present,
  # not its wording. No browser is used and no HTTP call or docker command is made.

  Scenario: The local development guide documents the Keycloak config contract
    Given the Keycloak service and the smoke script are merged
    When I read docs/local-development.md
    Then it has a Keycloak section with the start and smoke commands
    And the config contract lists each OIDC and KEYCLOAK key with a local value and a Scaleway value
    And the troubleshooting section covers the port, the realm not re-importing, and the image tag check
