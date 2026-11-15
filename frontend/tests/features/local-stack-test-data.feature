@S1-08
Feature: Per-worktree local stack test database and test user acceptance tests
  As a considered dresser
  I want the test database and the test sign-in of the local stack checked by executable tests
  So that the test runs use a fresh database and the worktree's own stack

  # Executable copy of the scenarios in docs/specs/S1-08.03-red-acceptance-fresh-test-database-and-playwright-with-a-test-user.md.
  # Keep the two in step. The "I run {string}" step is defined in local-stack.steps.ts and reused here.
  # The database scenario starts the shared stack, so it runs in the stack-lifecycle project. The sign-in scenario only reads it.
  # Test users are the synthetic persona.*@example.test users in the committed realm file. No real personal data is used.

  @stack-lifecycle @timeout:900000
  Scenario: The test database is fresh and migrated on every run
    Given a row was written to the test database in an earlier run
    When I run "python scripts/dev/up.py up"
    Then the test database "slaydrip_test" exists with every migration applied
    And the earlier row is gone and the dev database is untouched

  @timeout:300000
  Scenario: Playwright runs against the worktree's own stack with a test user
    Given the stack of this worktree is running
    When I run the Playwright acceptance suite
    Then the suite uses the web and API ports from this worktree's stack file
    And a synthetic test user signs in through the local Keycloak
