@S1-03 @hard-rule
Feature: EU-only regions in the local identity stack
  As a considered dresser
  I want every region value in the identity stack config checked automatically
  So that my account data stays in the EU, whether the config runs locally or in production

  # Executable copy of the hard-rule scenario in docs/specs/S1-03-local-keycloak.md and the S1-03.09 ticket.
  # Keep the two in step. This is a hard-rule test, not a feature scenario, so it runs first and stays on.
  # The steps read three committed files as text. No browser is used, and no HTTP call or docker command is made.

  Scenario: The local stack uses only the allowed Scaleway regions
    Given the files compose.yaml, infra/dev/keycloak/realm/slay-drip-realm.json and scripts/dev/keycloak-smoke.sh are present
    When I read every region value and every Scaleway host in those files
    Then every value is one of fr-par, nl-ams or pl-waw
    And no file names any other Scaleway region
