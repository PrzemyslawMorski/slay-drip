// Helpers for the local identity provider scenarios (tests/features/local-keycloak-*.feature).
// Config values come from the keys in docs/specs/S1-03-local-keycloak.md, with the local defaults from
// S1-03.03. HTTP goes through the Playwright request API. The stack is started on the host with
// "docker compose up -d"; nothing here starts, stops or queries it through Docker. compose.yaml is read
// as text. No browser is used. Nothing here prints a token, a password or a compose config dump.
import { readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readStack } from './stack';

// Repo root: this file is in frontend/tests/support/.
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export interface KeycloakConfig {
  issuerUrl: string;
  jwksUrl: string;
  clientId: string;
  redirectUri: string;
}

// Reads the OIDC_* keys from the environment, then from this worktree's stack file (ADR-0016), then the fixed defaults.
export function keycloakConfig(): KeycloakConfig {
  const stackEnv = readStack().env;
  return {
    issuerUrl:
      process.env.OIDC_ISSUER_URL ??
      stackEnv.OIDC_ISSUER_URL ??
      'http://127.0.0.1:8180/realms/slay-drip',
    jwksUrl:
      process.env.OIDC_JWKS_URL ??
      stackEnv.OIDC_JWKS_URL ??
      'http://127.0.0.1:8180/realms/slay-drip/protocol/openid-connect/certs',
    clientId: process.env.OIDC_CLIENT_ID ?? stackEnv.OIDC_CLIENT_ID ?? 'slay-drip-pwa',
    redirectUri:
      process.env.OIDC_REDIRECT_URI ??
      stackEnv.OIDC_REDIRECT_URI ??
      'http://localhost:5173/auth/callback',
  };
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

// What the static checks need from one service in compose.yaml.
export interface ComposeServiceFacts {
  // Each published port: the host IP as written (null when none is given) and the host port.
  ports: { hostIp: string | null; hostPort: number }[];
  // Each volume source as written. A named volume has a source that is a name, not a path.
  volumeSources: string[];
}

// Reads compose.yaml as text. The file is not executed.
export async function composeFileText(): Promise<string> {
  return readFile(path.join(REPO_ROOT, 'compose.yaml'), 'utf8');
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function isBlankOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

// Strips the dash, quotes and a trailing comment from one list item such as - "127.0.0.1:8180:8080".
function listItemValue(line: string): string {
  return line
    .trim()
    .replace(/^-\s*/, '')
    .replace(/\s+#.*$/, '')
    .replace(/^["']|["']$/g, '');
}

// Returns the facts for one service. Throws when the service is not defined, so a missing service fails the check.
export function composeServiceFacts(compose: string, service: string): ComposeServiceFacts {
  const lines = compose.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${service}:`);
  if (start < 0) {
    throw new Error(`compose.yaml defines no "${service}" service`);
  }
  const block: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!isBlankOrComment(line) && indentOf(line) <= 2) {
      break;
    }
    block.push(line);
  }

  // The list items directly under one key of the service (for example ports or volumes).
  const listUnder = (key: string): string[] => {
    const items: string[] = [];
    let inKey = false;
    for (const line of block) {
      if (isBlankOrComment(line)) {
        continue;
      }
      if (indentOf(line) === 4) {
        inKey = line.trim() === `${key}:`;
        continue;
      }
      if (inKey && indentOf(line) > 4 && line.trim().startsWith('-')) {
        items.push(listItemValue(line));
      }
    }
    return items;
  };

  const ports = listUnder('ports').map((item) => {
    const parts = item.split(':');
    return {
      hostIp: parts.length === 3 ? (parts[0] ?? null) : null,
      hostPort: Number(parts.length === 3 ? parts[1] : parts[0]),
    };
  });
  const volumeSources = listUnder('volumes').map((item) => item.split(':')[0] ?? '');
  return { ports, volumeSources };
}

// A named volume is referenced by a name. Paths start with "." or "/" or contain a Windows separator.
export function isNamedVolume(source: string): boolean {
  return (
    source !== '' && !source.startsWith('.') && !source.startsWith('/') && !source.includes('\\')
  );
}

// True when something accepts a TCP connection on host:port within the timeout.
export function tcpAnswers(host: string, port: number, timeoutMs = 3_000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (answered: boolean) => {
      socket.destroy();
      resolve(answered);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}
