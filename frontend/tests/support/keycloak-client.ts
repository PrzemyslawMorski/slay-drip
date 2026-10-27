// Helpers for the sign-in and admin scenarios (tests/features/local-keycloak-sign-in.feature, S1-03.07).
// The smoke script (scripts/dev/keycloak-smoke.sh, S1-03.02) makes the token, admin and registration calls.
// This file only runs the script as a child process, reads the committed realm file, and reports the script's
// exit status and output lines. It never re-derives a token, and it never reads or prints the admin client secret,
// the persona password or a token. No browser is used.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from './keycloak-stack';

export const SMOKE_SCRIPT = path.join(REPO_ROOT, 'scripts', 'dev', 'keycloak-smoke.sh');
export const REALM_FILE = path.join(
  REPO_ROOT,
  'infra',
  'dev',
  'keycloak',
  'realm',
  'slay-drip-realm.json',
);
export const SMOKE_PASSED_LINE = 'OK: Keycloak smoke passed';
export const SYNTHETIC_PERSONA_EMAIL = 'smoke.user@example.test';
export const BACKEND_ADMIN_CLIENT_ID = 'slay-drip-backend-admin';

export interface SmokeRun {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface RealmClient {
  clientId: string;
  publicClient?: boolean;
  serviceAccountsEnabled?: boolean;
}

export interface RealmUser {
  username?: string;
  email?: string;
  enabled?: boolean;
}

// Only the fields the scenarios read. The file holds throwaway credentials, so the rest is not typed or returned.
export interface CommittedRealm {
  realm?: string;
  registrationAllowed?: boolean;
  clients?: RealmClient[];
  users?: RealmUser[];
}

// Git Bash on Windows. A WSL bash.exe on PATH would run the script inside WSL, so prefer Git Bash when it exists.
const GIT_BASH_WINDOWS = 'C:\\Program Files\\Git\\bin\\bash.exe';

function bashCommand(): string {
  if (process.platform === 'win32' && existsSync(GIT_BASH_WINDOWS)) {
    return GIT_BASH_WINDOWS;
  }
  return 'bash';
}

// Runs `bash scripts/dev/keycloak-smoke.sh` from the repo root and resolves with its exit status and output.
// A non-zero exit resolves (the scenario decides what it means). A failure to start bash rejects.
// The output is returned to the caller and not printed here, because the script's output is the only evidence.
export function runSmokeScript(timeoutMs = 240_000): Promise<SmokeRun> {
  return new Promise((resolve, reject) => {
    execFile(
      bashCommand(),
      ['scripts/dev/keycloak-smoke.sh'],
      { cwd: REPO_ROOT, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error && typeof error.code === 'string') {
          reject(new Error(`could not start bash for the smoke script: ${error.message}`));
          return;
        }
        resolve({
          exitCode: error === null ? 0 : typeof error.code === 'number' ? error.code : 1,
          stdout,
          stderr,
        });
      },
    );
  });
}

// The last non-empty line of the text, or '' when there is none.
export function lastNonEmptyLine(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  return lines.length > 0 ? lines[lines.length - 1].trim() : '';
}

// The output lines the script prints for one of its four steps (for example "3/4 ...").
export function stepLines(stdout: string, step: number): string[] {
  const prefix = `${step}/4`;
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith(prefix));
}

// A short reason for a failed run that is safe to show in a test message: the exit status and the last output line.
export function failureSummary(run: SmokeRun): string {
  const last = lastNonEmptyLine(run.stderr) || lastNonEmptyLine(run.stdout);
  return `exit status ${run.exitCode}${last ? `, last line: ${last.slice(0, 200)}` : ''}`;
}

// Reads the committed realm import file. Fails with a clear message when the file does not exist yet.
export async function readCommittedRealm(): Promise<CommittedRealm> {
  if (!existsSync(REALM_FILE)) {
    throw new Error(
      'infra/dev/keycloak/realm/slay-drip-realm.json does not exist yet (S1-03.01 creates it)',
    );
  }
  return JSON.parse(await readFile(REALM_FILE, 'utf8')) as CommittedRealm;
}

// True when the smoke script exists in the worktree.
export function smokeScriptExists(): boolean {
  return existsSync(SMOKE_SCRIPT);
}
