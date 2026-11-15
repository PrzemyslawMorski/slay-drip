// Public configuration only. Anything here ships to every browser, so no secret belongs in this file.
// In the dev server, vite.config.ts defines __SLAYDRIP_DEV_STACK__ from this worktree's stack file (ADR-0016), so the
// local origins follow the worktree's ports. Outside the dev server it is null and the fixed local defaults apply.
// Other environments set the VITE_ variables at build time (docs/local-development.md).
declare const __SLAYDRIP_DEV_STACK__: {
  webOrigin: string;
  apiOrigin: string;
  keycloakOrigin: string;
} | null;

const devStack = __SLAYDRIP_DEV_STACK__;
const env = import.meta.env as Partial<Record<string, string>>;

export const config = {
  // Same-origin by default: the dev server proxies /api to this worktree's API, so no CORS is needed.
  apiBaseUrl: env.VITE_API_BASE_URL ?? '/api',
  oidc: {
    issuerUrl:
      env.VITE_OIDC_ISSUER_URL ??
      (devStack
        ? `${devStack.keycloakOrigin}/realms/slay-drip`
        : 'http://127.0.0.1:8180/realms/slay-drip'),
    clientId: env.VITE_OIDC_CLIENT_ID ?? 'slay-drip-pwa',
    audience: env.VITE_OIDC_AUDIENCE ?? devStack?.apiOrigin ?? 'http://127.0.0.1:8080',
    redirectUri:
      env.VITE_OIDC_REDIRECT_URI ??
      (devStack ? `${devStack.webOrigin}/auth/callback` : 'http://localhost:5173/auth/callback'),
  },
};
