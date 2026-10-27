// Helpers for the local identity provider scenarios (tests/features/local-keycloak-*.feature).
// Config values come from the keys in docs/specs/S1-03-local-keycloak.md, with the local defaults from
// S1-03.03. HTTP goes through the Playwright request API. docker compose runs as a child process.
// No browser is used. Nothing here prints a token, a password or a compose config dump.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Repo root: this file is in frontend/tests/support/.
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export interface KeycloakConfig {
  issuerUrl: string;
  jwksUrl: string;
  clientId: string;
  redirectUri: string;
}

// Reads the OIDC_* keys from the environment, falling back to the local values.
export function keycloakConfig(): KeycloakConfig {
  return {
    issuerUrl: process.env.OIDC_ISSUER_URL ?? 'http://127.0.0.1:8180/realms/slay-drip',
    jwksUrl:
      process.env.OIDC_JWKS_URL ??
      'http://127.0.0.1:8180/realms/slay-drip/protocol/openid-connect/certs',
    clientId: process.env.OIDC_CLIENT_ID ?? 'slay-drip-pwa',
    redirectUri: process.env.OIDC_REDIRECT_URI ?? 'http://localhost:5173/auth/callback',
  };
}

export interface ComposePublisher {
  URL: string;
  TargetPort: number;
  PublishedPort: number;
  Protocol: string;
}

export interface ComposeContainer {
  Service: string;
  State: string;
  Health: string;
  Publishers?: ComposePublisher[] | null;
}

// Runs `docker compose <args>` in the repo root. Rejects with the command and its stderr on a non-zero exit.
// stdout is returned to the caller and never printed, because `compose config` can contain secrets.
export function runCompose(args: string[], timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'docker',
      ['compose', ...args],
      { cwd: REPO_ROOT, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const reason = stderr.trim() || error.message;
          reject(new Error(`docker compose ${args.join(' ')} failed: ${reason}`));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

// Splits a command such as `docker compose up -d` into compose arguments. Refuses anything else.
export function composeArgsFrom(command: string): string[] {
  const parts = command.trim().split(/\s+/);
  if (parts[0] !== 'docker' || parts[1] !== 'compose' || parts.length < 3) {
    throw new Error(`Only "docker compose ..." commands are run here, got: ${command}`);
  }
  return parts.slice(2);
}

// `docker compose ps --format json` prints one object per line in current releases and an array in older ones.
function parseJsonOutput(text: string): unknown[] {
  const trimmed = text.trim();
  if (trimmed === '') {
    return [];
  }
  if (trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as unknown[];
  }
  return trimmed
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as unknown);
}

// The containers for one compose service, including stopped ones. Rejects at once when compose cannot find the service.
export async function composePs(service: string): Promise<ComposeContainer[]> {
  const stdout = await runCompose(['ps', '--all', '--format', 'json', service]);
  return parseJsonOutput(stdout) as ComposeContainer[];
}

// The `services` section of the compose file, as compose resolves it. Only the shape is returned to the caller.
export async function composeServices(): Promise<
  Record<string, { volumes?: { type?: string }[] | null } | undefined>
> {
  const stdout = await runCompose(['config', '--format', 'json']);
  const parsed = JSON.parse(stdout) as {
    services?: Record<string, { volumes?: { type?: string }[] | null } | undefined>;
  };
  return parsed.services ?? {};
}

// Reads the committed realm import file. Used for the static checks on the file.
export async function readRealmFile(): Promise<{
  clients?: { clientId: string; redirectUris?: string[] }[];
}> {
  const file = path.join(REPO_ROOT, 'infra', 'dev', 'keycloak', 'realm', 'slay-drip-realm.json');
  return JSON.parse(await readFile(file, 'utf8')) as {
    clients?: { clientId: string; redirectUris?: string[] }[];
  };
}

// Fetches the OIDC discovery document for the issuer from the config.
export function discoveryUrl(config: KeycloakConfig): string {
  return `${config.issuerUrl}/.well-known/openid-configuration`;
}
