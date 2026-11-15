// Step definitions for tests/features/local-stack-test-data.feature (S1-08.03).
// The database steps run "python scripts/dev/up.py sql" (a contract gap, see queryDatabase). The Playwright steps
// make HTTP requests and read committed files. The test process never runs docker or psql (ADR-0014).
// The step "I run {string}" is defined once, in local-stack.steps.ts, and reused by the feature here.
// Nothing here reads, prints or creates a .env file. The helpers are duplicated from local-stack.steps.ts,
// because the tickets do not list tests/support as a file to change.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type TestInfo } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { REPO_ROOT } from '../support/keycloak-stack';

const { Given, When, Then } = createBdd();

const UP_SCRIPT = 'scripts/dev/up.py';
const TEST_DATABASE = 'slaydrip_test';
const DEV_DATABASE = 'slaydrip';
const MARKER_TABLE = 'local_stack_marker';
const REALM_FILE = path.join(
  REPO_ROOT,
  'infra',
  'dev',
  'keycloak',
  'realm',
  'slay-drip-realm.json',
);

// The fields of .stack/stack.json that these steps read (S1-08 Design, stack file contract).
interface StackFile {
  ports?: Record<string, number>;
  env?: Record<string, string>;
}

interface RealmUser {
  email?: string;
  enabled?: boolean;
}

// Written by the Given step, read by the Then step of the same scenario.
const devSnapshots = new WeakMap<TestInfo, string>();
// Written by the When step, read by the Then steps of the same scenario.
const webResults = new WeakMap<TestInfo, { web: number; proxied: number }>();

function requireUpScript(root: string): void {
  if (!existsSync(path.join(root, ...UP_SCRIPT.split('/')))) {
    throw new Error(`${UP_SCRIPT} does not exist yet (S1-08.09 creates it)`);
  }
}

function stackFilePath(root: string): string {
  const override = process.env.SLAYDRIP_STACK_FILE;
  if (root === REPO_ROOT && override) {
    return override;
  }
  return path.join(root, '.stack', 'stack.json');
}

async function readStackFile(root: string): Promise<StackFile> {
  const file = stackFilePath(root);
  if (!existsSync(file)) {
    throw new Error('the stack file .stack/stack.json does not exist yet (S1-08.09 writes it)');
  }
  return JSON.parse(await readFile(file, 'utf8')) as StackFile;
}

function portOf(stack: StackFile, service: string): number {
  const port = stack.ports?.[service];
  if (port === undefined) {
    throw new Error(`the stack file has no port for ${service}`);
  }
  return port;
}

function envOf(stack: StackFile, key: string): string {
  const value = stack.env?.[key];
  if (value === undefined || value === '') {
    throw new Error(`the stack file env has no value for ${key}`);
  }
  return value;
}

// Runs one SQL statement against a database of this worktree's stack, through up.py. Rows come back one per line.
// CONTRACT GAP: S1-08.09 names no database query command. These steps assume
// "python scripts/dev/up.py sql --database NAME --query SQL", printing one row per line with tab-separated columns.
// The owner or S1-08.09 must confirm or change this before the database steps can go green.
function queryDatabase(database: string, sql: string): Promise<string[]> {
  requireUpScript(REPO_ROOT);
  return new Promise((resolve, reject) => {
    execFile(
      'python',
      [UP_SCRIPT, 'sql', '--database', database, '--query', sql],
      { cwd: REPO_ROOT, timeout: 60_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
      (error, stdout) => {
        if (error && typeof error.code === 'string') {
          reject(new Error(`could not start python: ${error.message}`));
          return;
        }
        if (error) {
          reject(
            new Error(`up.py sql on ${database} failed with exit status ${String(error.code)}`),
          );
          return;
        }
        resolve(
          stdout
            .split('\n')
            .map((line) => line.trimEnd())
            .filter((line) => line !== ''),
        );
      },
    );
  });
}

// The database state that the dev database must keep: applied migrations and the public table names.
// Read only. Nothing is written to the dev database.
async function snapshotOf(database: string): Promise<string> {
  const migrations = await queryDatabase(
    database,
    'SELECT version, dirty FROM schema_migrations ORDER BY version',
  );
  const tables = await queryDatabase(
    database,
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  return [...migrations, '--', ...tables].join('\n');
}

// The migration versions in backend/migrations, from the leading number of each .up.sql file (ADR-0008).
async function migrationVersions(): Promise<number[]> {
  const files = await readdir(path.join(REPO_ROOT, 'backend', 'migrations'));
  const versions = files
    .filter((file) => file.endsWith('.up.sql'))
    .map((file) => Number(/^(\d+)_/.exec(file)?.[1] ?? NaN))
    .sort((a, b) => a - b);
  expect(versions.length, 'up migrations in backend/migrations').toBeGreaterThan(0);
  return versions;
}

// Scenario 1: fresh and migrated test database on every run.

Given('a row was written to the test database in an earlier run', async () => {
  requireUpScript(REPO_ROOT);
  await readStackFile(REPO_ROOT);
  // A synthetic marker table with one row in the test database. The next run must drop it with the database.
  await queryDatabase(
    TEST_DATABASE,
    `CREATE TABLE IF NOT EXISTS ${MARKER_TABLE} (note text); INSERT INTO ${MARKER_TABLE} (note) VALUES ('synthetic-marker')`,
  );
  devSnapshots.set(test.info(), await snapshotOf(DEV_DATABASE));
});

Then(
  'the test database {string} exists with every migration applied',
  // eslint-disable-next-line no-empty-pattern
  async ({}, database: string) => {
    expect(database, 'the database the scenario checks').toBe(TEST_DATABASE);
    const expected = await migrationVersions();
    const rows = await queryDatabase(
      database,
      'SELECT version, dirty FROM schema_migrations ORDER BY version',
    );
    const applied = rows.map((row) => row.split('\t'));
    expect(
      applied.map(([version]) => Number(version)),
      'versions in schema_migrations on slaydrip_test',
    ).toEqual(expected);
    const dirty = applied.filter(([, flag]) =>
      ['t', 'true', '1'].includes((flag ?? '').toLowerCase()),
    );
    expect(dirty, 'dirty migration rows').toEqual([]);
  },
);

Then('the earlier row is gone and the dev database is untouched', async () => {
  const markerTables = await queryDatabase(
    TEST_DATABASE,
    `SELECT count(*) FROM pg_tables WHERE tablename = '${MARKER_TABLE}'`,
  );
  expect(Number(markerTables[0]), 'marker table count on slaydrip_test after the run').toBe(0);

  const before = devSnapshots.get(test.info());
  expect(before, 'dev database snapshot taken in the Given step').toBeDefined();
  expect(await snapshotOf(DEV_DATABASE), 'dev database state after the run').toBe(before);
});

// Scenario 2: Playwright against the worktree's own stack, with a synthetic test user.

Given('the stack of this worktree is running', async ({ request }) => {
  const stack = await readStackFile(REPO_ROOT);
  for (const service of ['api', 'web', 'keycloak']) {
    portOf(stack, service);
  }
  const api = await request.get(`http://127.0.0.1:${portOf(stack, 'api')}/healthz`);
  expect(api.status(), 'API /healthz status of this worktree').toBe(200);
});

When('I run the Playwright acceptance suite', async ({ request }) => {
  // The suite is not started from inside itself. This step requests the same web origin and proxied API path
  // that the suite uses, on the ports from this worktree's stack file.
  test.setTimeout(300_000);
  const stack = await readStackFile(REPO_ROOT);
  const web = portOf(stack, 'web');
  const page = await request.get(`http://127.0.0.1:${web}/`);
  const proxied = await request.get(`http://127.0.0.1:${web}/api/healthz`);
  webResults.set(test.info(), { web: page.status(), proxied: proxied.status() });
});

Then("the suite uses the web and API ports from this worktree's stack file", async () => {
  // Static check of the Playwright config: it reads the stack file, hard-codes no port 5173 and reuses no server.
  const config = await readFile(path.join(REPO_ROOT, 'frontend', 'playwright.config.ts'), 'utf8');
  expect(
    /stack\.json|SLAYDRIP_STACK_FILE/.test(config),
    'playwright.config.ts reads the stack file',
  ).toBe(true);
  expect(
    /(localhost|127\.0\.0\.1):5173/.test(config),
    'playwright.config.ts hard-codes port 5173',
  ).toBe(false);
  expect(
    /reuseExistingServer:\s*(true|!process\.env\.CI)/.test(config),
    'Playwright reuses a server it did not start',
  ).toBe(false);

  const results = webResults.get(test.info());
  expect(results, 'web and API requests recorded in the When step').toBeDefined();
  expect(results?.web, 'web origin from the stack file answers').toBe(200);
  expect(results?.proxied, 'API through the web origin answers').toBe(200);
});

Then('a synthetic test user signs in through the local Keycloak', async ({ request }) => {
  // The test user is a synthetic persona from the committed realm file. No password is read or printed here.
  const realm = JSON.parse(await readFile(REALM_FILE, 'utf8')) as { users?: RealmUser[] };
  const persona = (realm.users ?? []).find(
    (user) => (user.email ?? '').endsWith('@example.test') && user.enabled !== false,
  );
  expect(
    persona,
    'the realm file has an enabled synthetic persona@example.test user',
  ).toBeDefined();

  // The issuer of this worktree's stack is served on this worktree's Keycloak port.
  const stack = await readStackFile(REPO_ROOT);
  const issuer = envOf(stack, 'OIDC_ISSUER_URL');
  expect(new URL(issuer).port, 'port of OIDC_ISSUER_URL').toBe(String(portOf(stack, 'keycloak')));

  // A PKCE S256 authorization request for the PWA client gets the login form of the local realm.
  const auth = new URL(`${issuer}/protocol/openid-connect/auth`);
  auth.search = new URLSearchParams({
    client_id: envOf(stack, 'OIDC_CLIENT_ID'),
    redirect_uri: envOf(stack, 'OIDC_REDIRECT_URI'),
    response_type: 'code',
    scope: 'openid',
    state: 'synthetic-state',
    code_challenge: 'A'.repeat(43),
    code_challenge_method: 'S256',
  }).toString();
  // maxRedirects is 0, so the login form is the response itself. The password is typed by no step here.
  const response = await request.get(auth.toString(), { maxRedirects: 0 });
  expect(response.status(), 'login page status of this worktree Keycloak').toBe(200);
  expect(await response.text(), 'login form of the local realm').toContain('kc-form-login');
});
