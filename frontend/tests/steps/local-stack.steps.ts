// Step definitions for tests/features/local-stack.feature (S1-08.02).
// The steps run scripts/dev/up.py as a child process and check its exit status, its wall-clock time and the
// stack file it writes. The test process never runs docker (ADR-0014). Nothing here reads, prints or creates a
// .env file: the scenarios never stat or open any path that ends in .env.
// The helpers are duplicated in local-stack-test-data.steps.ts, because the tickets do not list tests/support
// as a file to change. A shared module there would be the cleaner home.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type TestInfo } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { REPO_ROOT } from '../support/keycloak-stack';

const { Given, When, Then } = createBdd();

// ADR-0016: the budget for a cold start is 30 seconds (the 10 seconds of the spike goal is not reachable).
const BUDGET_SECONDS = 30;
const UP_SCRIPT = 'scripts/dev/up.py';
const SECOND_WORKTREE_ENV = 'SLAYDRIP_SECOND_WORKTREE';

// The fields of .stack/stack.json that these steps read (S1-08 Design, stack file contract).
interface StackFile {
  project?: string;
  ports?: Record<string, number>;
  env?: Record<string, string>;
  test_database_url?: string;
}

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  elapsedMs: number;
}

interface ScenarioState {
  roots: string[];
  runs: RunResult[];
}

// Written by the When step, read by the Then steps of the same scenario.
const states = new WeakMap<TestInfo, ScenarioState>();

function stateOf(testInfo: TestInfo): ScenarioState {
  const state = states.get(testInfo);
  if (state === undefined) {
    throw new Error('The up.py command has not run in this scenario');
  }
  return state;
}

function upScriptPath(root: string): string {
  return path.join(root, ...UP_SCRIPT.split('/'));
}

// Fails with a clear message while the entry script does not exist (S1-08.09 creates it).
function requireUpScript(root: string): void {
  if (!existsSync(upScriptPath(root))) {
    throw new Error(`${UP_SCRIPT} does not exist yet (S1-08.09 creates it)`);
  }
}

// Splits "python scripts/dev/up.py up --budget 30" into arguments. Refuses any other command.
function upPyArgsFrom(command: string): string[] {
  const parts = command.trim().split(/\s+/);
  if (parts[0] !== 'python' || parts[1] !== UP_SCRIPT) {
    throw new Error(`Only "python ${UP_SCRIPT} ..." commands are run here, got: ${command}`);
  }
  return parts.slice(2);
}

// Runs python with a script path relative to the worktree root. A non-zero exit resolves, and the scenario
// decides what it means. Only a failure to start python rejects. Output is kept, not printed, because the
// stack file and the database output can hold local values.
function runPython(
  root: string,
  args: string[],
  timeoutMs: number,
  extraEnv: Record<string, string> = {},
): Promise<RunResult> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    execFile(
      'python',
      args,
      {
        cwd: root,
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, ...extraEnv },
      },
      (error, stdout, stderr) => {
        const elapsedMs = Date.now() - started;
        if (error && typeof error.code === 'string') {
          reject(new Error(`could not start python: ${error.message}`));
          return;
        }
        const exitCode = error === null ? 0 : typeof error.code === 'number' ? error.code : 1;
        resolve({ exitCode, stdout, stderr, elapsedMs });
      },
    );
  });
}

// Runs "python scripts/dev/up.py <args>" in a worktree.
function runUpPy(root: string, args: string[], timeoutMs: number): Promise<RunResult> {
  requireUpScript(root);
  return runPython(root, [UP_SCRIPT, ...args], timeoutMs);
}

// The stack file of a worktree. SLAYDRIP_STACK_FILE overrides the path for this worktree only.
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

// Runs one SQL statement against a database of a worktree's stack, through up.py. The test process never runs psql.
// CONTRACT GAP: S1-08.09 names no database query command. These steps assume
// "python scripts/dev/up.py sql --database NAME --query SQL", which prints one row per line with tab-separated
// columns. The owner or S1-08.09 must confirm or change this before the database steps can go green.
async function queryDatabase(root: string, database: string, sql: string): Promise<string[]> {
  const run = await runUpPy(root, ['sql', '--database', database, '--query', sql], 60_000);
  expect(run.exitCode, `up.py sql on ${database} exit status`).toBe(0);
  return run.stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line !== '');
}

// The up.py run of this scenario. Fails when the When step has not run it.
function singleRun(): RunResult {
  const [run] = stateOf(test.info()).runs;
  if (run === undefined) {
    throw new Error('The up.py command has not run in this scenario');
  }
  return run;
}

function expectRunsSucceeded(runs: RunResult[]): void {
  for (const run of runs) {
    expect(run.exitCode, `up.py exit status, last output line: ${lastLine(run)}`).toBe(0);
  }
}

function lastLine(run: RunResult): string {
  const lines = `${run.stderr}\n${run.stdout}`.split('\n').filter((line) => line.trim() !== '');
  return (lines[lines.length - 1] ?? '').slice(0, 200);
}

// Scenario 1: cold start within the budget.

Given("a worktree with no running stack and the stack's images already pulled", async () => {
  // Stops any running stack of this worktree, so the next run is a cold start. The image pull is the
  // operator's precondition and is not checked here.
  requireUpScript(REPO_ROOT);
  const down = await runUpPy(REPO_ROOT, ['down'], 600_000);
  expect(down.exitCode, `up.py down exit status: ${lastLine(down)}`).toBe(0);
});

// Defined once for every feature: playwright-bdd step definitions are global, so local-stack-test-data.feature
// uses this step too. playwright-bdd passes the fixtures object first, and this step uses no fixture.
// eslint-disable-next-line no-empty-pattern
When('I run {string}', async ({}, command: string) => {
  // The first run of the stack can take minutes. Give it the stack-lifecycle timeout.
  test.setTimeout(900_000);
  const args = upPyArgsFrom(command);
  const run = await runUpPy(REPO_ROOT, args, 840_000);
  states.set(test.info(), { roots: [REPO_ROOT], runs: [run] });
});

Then('the command exits with code 0 within 30 seconds', () => {
  const run = singleRun();
  expect(run.exitCode, `up.py exit status, last output line: ${lastLine(run)}`).toBe(0);
  expect(
    run.elapsedMs / 1000,
    `wall-clock seconds for up.py (budget ${BUDGET_SECONDS} s)`,
  ).toBeLessThanOrEqual(BUDGET_SECONDS);
});

Then(
  'the API, the S3 bucket, the test database and Keycloak all answer their checks',
  async ({ request }) => {
    const stack = await readStackFile(REPO_ROOT);

    // The API answers its health check on the port this worktree's stack file gives it.
    const api = await request.get(`http://127.0.0.1:${portOf(stack, 'api')}/healthz`);
    expect(api.status(), 'API /healthz status').toBe(200);

    // The S3 bucket: the repo's own round-trip check, run with this worktree's config keys.
    const s3 = await runPython(REPO_ROOT, ['scripts/dev/s3_smoke.py'], 120_000, stack.env ?? {});
    expect(s3.exitCode, `S3 round-trip check: ${lastLine(s3)}`).toBe(0);

    // The test database answers a query.
    const rows = await queryDatabase(REPO_ROOT, 'slaydrip_test', 'SELECT 1');
    expect(rows.length, 'rows from SELECT 1 on slaydrip_test').toBeGreaterThan(0);

    // Keycloak serves its discovery document at the issuer from this worktree's config.
    const issuer = envOf(stack, 'OIDC_ISSUER_URL');
    const discovery = await request.get(`${issuer}/.well-known/openid-configuration`);
    expect(discovery.status(), 'Keycloak discovery document status').toBe(200);
  },
);

// Scenario 2: no .env file is read.

Given('a new worktree with no .env file', () => {
  // The test never stats, opens or lists a .env path. The absence is the worktree's state, set up by the operator.
  requireUpScript(REPO_ROOT);
});

Then('the stack starts and no .env file is read or created', async () => {
  const run = singleRun();
  expect(run.exitCode, `up.py exit status, last output line: ${lastLine(run)}`).toBe(0);

  // Static check: up.py never names a .env file. Comment lines are skipped, so a note in a comment does not count.
  const source = await readFile(upScriptPath(REPO_ROOT), 'utf8');
  const codeLines = source
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => !line.trim().startsWith('#'));
  const envHits = codeLines
    .filter(({ line }) => /\.env(?![A-Za-z0-9_-])/.test(line))
    .map(({ number }) => number);
  expect(envHits, 'lines of scripts/dev/up.py that name a .env file').toEqual([]);

  // Static check: compose.yaml loads no env file.
  const compose = await readFile(path.join(REPO_ROOT, 'compose.yaml'), 'utf8');
  expect(/^\s*env_file\s*:/m.test(compose), 'compose.yaml sets env_file').toBe(false);
});

// A regular expression, because a Cucumber expression reads the "/" in the path as an alternative.
Then(
  /^every local value comes from compose\.yaml or a committed file under infra\/dev\/$/,
  async () => {
    // Checks the secrets in the stack file: each one must appear in compose.yaml or a committed file under infra/dev/.
    // Ports and URLs differ per worktree by design, so they are not compared. This covers secrets only, not every value.
    const stack = await readStackFile(REPO_ROOT);
    const committed = [
      await readFile(path.join(REPO_ROOT, 'compose.yaml'), 'utf8'),
      ...(await committedTexts(path.join(REPO_ROOT, 'infra', 'dev'))),
    ].join('\n');
    const secretKeys = Object.keys(stack.env ?? {}).filter((key) =>
      /KEY|SECRET|PASSWORD/.test(key),
    );
    expect(secretKeys.length, 'secret keys in the stack file env').toBeGreaterThan(0);
    for (const key of secretKeys) {
      const value = envOf(stack, key);
      expect(committed.includes(value), `${key} comes from a committed file`).toBe(true);
    }
  },
);

// The text of every file under a folder, read recursively. Only committed config is read here.
async function committedTexts(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const texts: string[] = [];
  for (const entry of entries) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      texts.push(...(await committedTexts(full)));
    } else if (entry.isFile()) {
      texts.push(await readFile(full, 'utf8'));
    }
  }
  return texts;
}

// Scenario 3: two worktrees at the same time.

Given('two worktrees with different paths', () => {
  // The second worktree is named by the operator in SLAYDRIP_SECOND_WORKTREE. The test does not pick one, because
  // starting a stack in another agent's checkout would be an intrusion.
  requireUpScript(REPO_ROOT);
  const other = process.env[SECOND_WORKTREE_ENV];
  if (!other) {
    throw new Error(
      `set ${SECOND_WORKTREE_ENV} to a second worktree path; the test does not pick one`,
    );
  }
  const otherRoot = path.resolve(other);
  expect(otherRoot, 'the second worktree is a different path').not.toBe(path.resolve(REPO_ROOT));
  requireUpScript(otherRoot);
  states.set(test.info(), { roots: [path.resolve(REPO_ROOT), otherRoot], runs: [] });
});

When('both stacks are started', async () => {
  test.setTimeout(900_000);
  const state = stateOf(test.info());
  // Both starts run at the same time, because the scenario is about concurrent stacks.
  state.runs = await Promise.all(state.roots.map((root) => runUpPy(root, ['up'], 840_000)));
});

Then('each gets its own compose project name and its own ports', async () => {
  const state = stateOf(test.info());
  expectRunsSucceeded(state.runs);
  const [first, second] = await Promise.all(state.roots.map((root) => readStackFile(root)));
  expect(first.project, 'project name of the first worktree').toBeTruthy();
  expect(second.project, 'project name of the second worktree').toBeTruthy();
  expect(first.project).not.toBe(second.project);

  const firstPorts = Object.values(first.ports ?? {});
  const secondPorts = new Set(Object.values(second.ports ?? {}));
  expect(firstPorts.length, 'ports of the first worktree').toBeGreaterThan(0);
  expect(
    firstPorts.filter((port) => secondPorts.has(port)),
    'host ports used by both worktrees',
  ).toEqual([]);
});

// The host ports a stack file names: its port map and every port in its env values and database URL.
function portsReachableFrom(stack: StackFile): Set<number> {
  const found = new Set<number>(Object.values(stack.ports ?? {}));
  const values = [...Object.values(stack.env ?? {}), stack.test_database_url ?? ''];
  for (const value of values) {
    for (const match of value.matchAll(/:(\d{2,5})(?=[/?\s]|$)/g)) {
      found.add(Number(match[1]));
    }
  }
  return found;
}

Then("neither worktree's tests reach the other worktree's services", async () => {
  const state = stateOf(test.info());
  const [first, second] = await Promise.all(state.roots.map((root) => readStackFile(root)));
  const firstReach = portsReachableFrom(first);
  const secondReach = portsReachableFrom(second);
  expect(
    [...firstReach].filter((port) => secondReach.has(port)),
    'ports that the two worktrees would both use from their tests',
  ).toEqual([]);
});
