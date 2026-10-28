// Public configuration only. Anything here ships to every browser, so no secret belongs in this file.
// The defaults are the local stack's values (docs/local-development.md). Other environments set the VITE_ variables at build time.
const env = import.meta.env as Partial<Record<string, string>>;

export const config = {
  apiBaseUrl: env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080',
  oidc: {
    issuerUrl: env.VITE_OIDC_ISSUER_URL ?? 'http://127.0.0.1:8180/realms/slay-drip',
    clientId: env.VITE_OIDC_CLIENT_ID ?? 'slay-drip-pwa',
    audience: env.VITE_OIDC_AUDIENCE ?? 'slay-drip-api',
    redirectUri: env.VITE_OIDC_REDIRECT_URI ?? 'http://localhost:5173/auth/callback',
  },
};
