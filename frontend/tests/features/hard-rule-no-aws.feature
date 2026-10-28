@S1-03 @hard-rule
Feature: No AWS references in the local identity stack
  As a considered dresser
  I want the identity stack files checked for AWS references automatically
  So that the platform stays on Scaleway, as the team decided

  # Executable copy of the hard-rule scenario in docs/specs/S1-03-local-keycloak.md and the S1-03.10 ticket.
  # Keep the two in step. This is a hard-rule test, not a feature scenario, so it runs first and stays on.
  # The steps read the named files and folder as text, case-insensitively. No browser is used, and no docker
  # command or HTTP call is made. scripts/dev/s3_smoke.py is outside this scan.

  Scenario: The local stack references no AWS resource, SDK or CLI
    Given compose.yaml, the infra/dev/keycloak folder, scripts/dev/keycloak_smoke.py and docs/local-development.md are present
    When I search them for AWS resource, SDK or CLI references
    Then none of them contains "amazonaws", "aws-sdk", "awscli", "aws cli" or "AWS_"
