# Test-driven development rules

Applies to every change in `backend/` and `frontend/`. Stack-specific test tools are in [backend-ruleset.md](backend-ruleset.md) and [frontend-ruleset.md](frontend-ruleset.md). Ticket and acceptance rules are in [specs/_ticket-template.md](../specs/_ticket-template.md) and [ADR-0003](../adr/0003-gherkin-acceptance-tests-with-playwright.md).

## The cycle

Write each change in small steps: **red** (a test that fails for the right reason), **green** (the least code that passes), **refactor** (clean up with the tests still green). Repeat per behaviour, not per file.

## Rules

| ID | Rule | Level |
| --- | --- | --- |
| TDD-01 | **New code has tests.** Every new function, method, component, route or branch with logic ships with a test in the same change. | Blocking |
| TDD-02 | **Changed behaviour has tests.** A change in behaviour updates or adds the test that covers it in the same change. | Blocking |
| TDD-03 | **Bug fixes start with a failing test** that reproduces the bug, then the fix makes it pass. The test stays. | Blocking |
| TDD-04 | **Acceptance criteria map to tests.** Each Gherkin scenario in a ticket has at least one automated test. Acceptance scenarios run in Playwright (ADR-0003). | Blocking |
| TDD-05 | **Hard rules have tests.** Age gate, consent gates, deletion on revoke, owner scoping, EU region checks, banned-language checks and hard constraint filters each have an automated test that fails if the rule is broken (see [security.md §16](../security.md#16-testing-and-review)). | Blocking |
| TDD-06 | **Tests do not get weaker to pass.** Do not delete, skip, loosen or `only`-focus a test to get a change green. If a test is wrong, fix it and say why in the PR. | Blocking |
| TDD-07 | **No skipped tests without a ticket.** `t.Skip`, `test.skip`, `it.skip`, `describe.skip` and `.only` need a linked ticket key in the same line. | Blocking |
| TDD-08 | **Tests are deterministic.** No real sleeps, no wall-clock time, no network to real vendors, no shared state between tests. Inject time, randomness and clients. | Blocking |
| TDD-09 | **Tests use synthetic data only.** Fixtures and generated images are synthetic and freely licensed. No real personal data or photos. | Blocking |
| TDD-10 | **Test names state the behaviour.** For example `TestSignUpRejectsUnder18` in Go or `rejects a photo over the size limit` in TypeScript, not `test1`. | Advisory |
| TDD-11 | **Tests fail for the right reason.** A test that passes on the first run without a visible red step is suspect. Check that it fails when the behaviour is removed. | Advisory |
| TDD-12 | **Prefer test-first commits.** Where practical, commit the failing test before the code that makes it pass, so the history shows the cycle. | Advisory |
| TDD-13 | **Coverage target.** Changed lines have at least 80% coverage. This is a target for review now and a CI gate once CI runs the coverage report (follow-up). | Advisory |

## Exemptions

TDD-01 and TDD-02 do not apply to:

- Documentation, comments and markdown.
- Lockfile-only and pure formatting changes.
- Generated code, if the generator is itself tested.
- Pure configuration with no logic. Infrastructure config is checked by its own validation step.

The PR must name the exemption and why. A reviewer may still ask for a test.

## Reviewer checklist

- [ ] Every new logic path in the diff has a test that would fail without it.
- [ ] No test was removed, skipped or weakened without a reason in the PR.
- [ ] Each Gherkin scenario in the linked ticket maps to a test.
- [ ] Hard-rule tests exist for any change to personal, body, consent or region code.
- [ ] Tests run without network, real time or real vendors.
