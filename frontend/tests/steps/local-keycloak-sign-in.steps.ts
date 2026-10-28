// Step definitions for tests/features/local-keycloak-sign-in.feature (S1-03.07).
// The smoke script (S1-03.02) makes the token and admin calls. These steps run it as a child process, read the
// committed realm file, and check the script's exit status and output lines. No browser is opened.
import { expect, test, type TestInfo } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import {
  BACKEND_ADMIN_CLIENT_ID,
  SMOKE_PASSED_LINE,
  SYNTHETIC_PERSONA_EMAIL,
  failureSummary,
  lastNonEmptyLine,
  readCommittedRealm,
  runSmokeScript,
  smokeScriptExists,
  stepLines,
  type SmokeRun,
} from '../support/keycloak-client';

const { Given, When, Then } = createBdd();

// The script run from the When step, read by the Then steps of the same scenario.
const runs = new WeakMap<TestInfo, SmokeRun>();

// Runs the smoke script once for this scenario. It fails at once when the script does not exist yet.
async function runScriptForScenario(): Promise<void> {
  expect(smokeScriptExists(), 'scripts/dev/keycloak-smoke.sh exists (S1-03.02 creates it)').toBe(
    true,
  );
  const run = await runSmokeScript();
  runs.set(test.info(), run);
}

function recordedRun(): SmokeRun {
  const run = runs.get(test.info());
  if (run === undefined) {
    throw new Error('The smoke script has not run in this scenario');
  }
  return run;
}

// The script's own per-call checks are in its step lines (S1-03.02). A passing run has exit status 0 and prints the step.
function expectStepPassed(run: SmokeRun, step: number, what: string): void {
  expect(run.exitCode, `smoke script exit status before ${what}: ${failureSummary(run)}`).toBe(0);
  expect(
    stepLines(run.stdout, step).length,
    `smoke script printed step ${step}/4 for ${what}`,
  ).toBeGreaterThan(0);
}

// Scenario 1: synthetic persona sign-in with PKCE S256.

Given(
  'the slay-drip realm is imported with the synthetic persona smoke.user@example.test',
  async () => {
    // Static check of the committed realm file. The live import is checked by the smoke script (step 3/4).
    const realm = await readCommittedRealm();
    const persona = (realm.users ?? []).find((user) => user.email === SYNTHETIC_PERSONA_EMAIL);
    expect(persona, `the realm file imports ${SYNTHETIC_PERSONA_EMAIL}`).toBeDefined();
  },
);

When(
  'the smoke script runs the authorization code flow with PKCE S256 for client slay-drip-pwa',
  async () => {
    test.setTimeout(300_000);
    await runScriptForScenario();
  },
);

Then('the token endpoint returns an access token and an ID token', () => {
  expectStepPassed(recordedRun(), 3, 'the token endpoint check');
});

Then('the access token audience includes slay-drip-api', () => {
  // The audience check is part of the script's step 3/4. The test does not decode the token.
  expectStepPassed(recordedRun(), 3, 'the audience check');
});

// playwright-bdd passes the fixtures object first when a step has a parameter. This step uses no fixture.
// eslint-disable-next-line no-empty-pattern
Then('the script ends with {string}', ({}, expected: string) => {
  const run = recordedRun();
  expect(run.exitCode, `smoke script exit status: ${failureSummary(run)}`).toBe(0);
  // The feature's quoted text must be the success line that the smoke script prints.
  expect(expected).toBe(SMOKE_PASSED_LINE);
  expect(lastNonEmptyLine(run.stdout)).toBe(SMOKE_PASSED_LINE);
});

// Scenario 2: backend admin client, throwaway user lifecycle.

Given('client slay-drip-backend-admin is configured for client credentials', async () => {
  const realm = await readCommittedRealm();
  const client = (realm.clients ?? []).find(
    (candidate) => candidate.clientId === BACKEND_ADMIN_CLIENT_ID,
  );
  expect(client, `the realm file defines ${BACKEND_ADMIN_CLIENT_ID}`).toBeDefined();
  expect(client?.publicClient, `${BACKEND_ADMIN_CLIENT_ID} is confidential`).toBe(false);
  expect(client?.serviceAccountsEnabled, `${BACKEND_ADMIN_CLIENT_ID} uses a service account`).toBe(
    true,
  );
});

When(
  'the smoke script gets a token, creates a throwaway synthetic user, revokes its sessions and deletes it',
  async () => {
    test.setTimeout(300_000);
    await runScriptForScenario();
  },
);

Then('the create, logout and delete calls return HTTP 201, 204 and 204', () => {
  // The HTTP status of each call is checked by the script's step 4/4. The test reads its exit status and step line.
  expectStepPassed(recordedRun(), 4, 'the create, logout and delete calls');
});

Then('the throwaway user is no longer found afterwards', () => {
  // The script's trap removes the throwaway user and its step 4/4 checks the lookup. The test reads the exit status.
  expectStepPassed(recordedRun(), 4, 'the lookup after the delete');
});

// Scenario 3: self-service registration on, static check of the committed file.

// A regular expression, because a Cucumber expression reads the "/" in the path as an alternative.
Given(
  /^the committed realm file is infra\/dev\/keycloak\/realm\/slay-drip-realm\.json$/,
  async () => {
    await readCommittedRealm();
  },
);

When('the smoke script reads that file', async () => {
  test.setTimeout(300_000);
  await runScriptForScenario();
});

Then('registrationAllowed is true', async () => {
  // Read from the committed file, the same file the script reads. The admin client cannot read the live realm.
  const realm = await readCommittedRealm();
  expect(realm.registrationAllowed, 'registrationAllowed in the committed realm file').toBe(true);
});

Then('the script reports this as a static check of the committed file', () => {
  const run = recordedRun();
  expect(run.exitCode, `smoke script exit status: ${failureSummary(run)}`).toBe(0);
  const reported = run.stdout
    .split('\n')
    .some((line) => /static/i.test(line) && /registration/i.test(line));
  expect(reported, 'the script prints a static registration check line').toBe(true);
});
