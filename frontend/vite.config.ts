/// <reference types="vitest/config" />
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server reads this worktree's ports from the stack file written by up.py (ADR-0016, S1-08.11).
// It never falls back to a fixed port, because a silent fallback lets two worktrees clash.
const STACK_START_COMMAND = 'python scripts/dev/up.py up';
// The API is reached through the dev server's /api proxy, so the browser calls the API same-origin (no CORS).
const API_PROXY_PREFIX = '/api';

// The dev-only values that src/config.ts reads through the __SLAYDRIP_DEV_STACK__ define. Null outside the dev server.
export interface DevStack {
  webPort: number;
  webOrigin: string;
  apiOrigin: string;
  keycloakOrigin: string;
}

function portFrom(stack: Record<string, unknown>, service: string, file: string): number {
  const ports = stack.ports;
  const value =
    typeof ports === 'object' && ports !== null
      ? (ports as Record<string, unknown>)[service]
      : undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${file} has no valid ports.${service}. Run "${STACK_START_COMMAND}" again.`);
  }
  return value;
}

// SLAYDRIP_STACK_FILE overrides the path. The default is .stack/stack.json at the worktree root.
function readDevStack(): DevStack {
  const override = process.env.SLAYDRIP_STACK_FILE;
  const file = override
    ? path.resolve(override)
    : path.resolve(import.meta.dirname, '..', '.stack', 'stack.json');
  if (!existsSync(file)) {
    throw new Error(
      `The stack file ${file} does not exist. Start this worktree's stack first: ${STACK_START_COMMAND}`,
    );
  }
  const stack = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  const webPort = portFrom(stack, 'web', file);
  return {
    webPort,
    webOrigin: `http://localhost:${webPort}`,
    apiOrigin: `http://127.0.0.1:${portFrom(stack, 'api', file)}`,
    keycloakOrigin: `http://127.0.0.1:${portFrom(stack, 'keycloak', file)}`,
  };
}

// Fills the connect-src placeholder in index.html. Dev adds the local identity provider. Builds use VITE_CSP_CONNECT_SRC,
// so no local origin reaches a production page (security guide, section 11).
function contentSecurityPolicy(devKeycloakOrigin: string | undefined): Plugin {
  return {
    name: 'slay-drip-csp-connect-src',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const sources = context.server
          ? (devKeycloakOrigin ?? '')
          : (process.env.VITE_CSP_CONNECT_SRC ?? '');
        return html.replace('%CSP_CONNECT_SRC%', sources);
      },
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // Vitest runs in mode "test" and needs no stack file. Only the dev server reads it.
  const devStack = command === 'serve' && mode !== 'test' ? readDevStack() : null;
  return {
    plugins: [react(), contentSecurityPolicy(devStack?.keycloakOrigin)],
    define: {
      __SLAYDRIP_DEV_STACK__: JSON.stringify(devStack),
    },
    server: {
      port: devStack?.webPort,
      strictPort: true,
      proxy: devStack
        ? {
            [API_PROXY_PREFIX]: {
              target: devStack.apiOrigin,
              // The API routes have no /api prefix (for example /healthz), so the prefix is stripped here.
              // Only the exact segment is stripped, so /apidocs is not rewritten.
              rewrite: (urlPath: string) => urlPath.replace(/^\/api(?=\/|\?|$)/, '') || '/',
            },
          }
        : undefined,
    },
    test: {
      // Unit tests cover pure logic only. Browser behaviour is covered by the Playwright acceptance tests.
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'node',
    },
  };
});
