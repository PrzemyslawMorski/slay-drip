// Reads this worktree's stack file, written by scripts/dev/up.py (ADR-0016, S1-08.12). The Playwright run takes the web
// and API URLs from it, so it tests this worktree's own stack. It never starts a server and never reads a .env file.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Repo root: this file is in frontend/tests/support/.
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const START_COMMAND = 'python scripts/dev/up.py up';

export interface StackFile {
  project: string;
  ports: Record<string, number>;
  urls: { host: Record<string, string>; network: Record<string, string> };
  env: Record<string, string>;
  test_database_url: string;
}

// SLAYDRIP_STACK_FILE overrides the path. The default is .stack/stack.json at the worktree root.
export function stackFilePath(): string {
  const override = process.env.SLAYDRIP_STACK_FILE;
  return override ? path.resolve(override) : path.join(REPO_ROOT, '.stack', 'stack.json');
}

// Fails with the start command when the stack file is missing or incomplete. Never falls back to a fixed port.
export function readStack(): StackFile {
  const file = stackFilePath();
  if (!existsSync(file)) {
    throw new Error(`The stack file ${file} does not exist. Start this worktree's stack first: ${START_COMMAND}`);
  }
  const data = JSON.parse(readFileSync(file, 'utf8')) as Partial<StackFile>;
  if (!data.project || !data.ports || !data.urls?.host?.web || !data.urls.host.api) {
    throw new Error(`${file} has no ports or host URLs. Run "${START_COMMAND}" again.`);
  }
  return { env: {}, test_database_url: '', ...data } as StackFile;
}

// The web origin of this worktree's stack, for example http://localhost:23450.
export function appOrigin(): string {
  return readStack().urls.host.web;
}

// The API origin of this worktree's stack, reached directly on 127.0.0.1 (the audience the token carries).
export function apiOrigin(): string {
  return readStack().urls.host.api;
}
