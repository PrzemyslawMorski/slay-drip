/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The local stack's API and identity provider (docs/local-development.md). Dev server only.
const LOCAL_STACK_CONNECT_SOURCES = 'http://127.0.0.1:8080 http://127.0.0.1:8180';

// Fills the connect-src placeholder in index.html. Dev adds the local stack. Builds use VITE_CSP_CONNECT_SRC,
// so no local origin reaches a production page (security guide, section 11).
function contentSecurityPolicy(): Plugin {
  return {
    name: 'slay-drip-csp-connect-src',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const sources = context.server
          ? LOCAL_STACK_CONNECT_SOURCES
          : (process.env.VITE_CSP_CONNECT_SRC ?? '');
        return html.replace('%CSP_CONNECT_SRC%', sources);
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    // Unit tests cover pure logic only. Browser behaviour is covered by the Playwright acceptance tests.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
