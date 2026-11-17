@S1-08 @stack-lifecycle
Feature: Per-worktree local stack start-up acceptance tests
  As a considered dresser
  I want the whole app to start locally in its own worktree within the budget
  So that I and the agents can test it end to end without clashes

  # Executable copy of the scenarios in docs/specs/S1-08.02-red-acceptance-cold-start-budget-no-env-and-no-clash-between-worktrees.md.
  # Keep the two in step. The owner-approved nightly budget is 120 seconds (ADR-0016).
  # The steps run the entry script scripts/dev/up.py as a child process. The test process never runs docker (ADR-0014).
  # The scenarios start and stop the shared local stack, so they run in the stack-lifecycle project, one at a time.

  @timeout:900000
  Scenario: Cold start of the local stack takes at most 120 seconds
    Given a worktree with no running stack and the stack's images already pulled
    When I run "python scripts/dev/up.py up --budget 120"
    Then the command exits with code 0 within 120 seconds
    And the API, the S3 bucket, the test database and Keycloak all answer their checks

  @timeout:900000
  Scenario: No .env file is read
    Given a new worktree with no .env file
    When I run "python scripts/dev/up.py up"
    Then the stack starts and no .env file is read or created
    And every local value comes from compose.yaml or a committed file under infra/dev/

  @timeout:900000
  Scenario: Two worktrees run their stacks at the same time without a clash
    Given two worktrees with different paths
    When both stacks are started
    Then each gets its own compose project name and its own ports
    And neither worktree's tests reach the other worktree's services
