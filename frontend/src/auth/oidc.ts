// Sign-in and registration against the identity provider (ADR-0010).
// Authorization code flow with PKCE S256 as the public client slay-drip-pwa.
// Tokens live in memory only, so a page reload signs the person out. The config keys match
// docs/local-development.md. Values are public configuration and may appear in the build.

export interface OidcConfig {
  issuer: string;
  clientId: string;
  audience: string;
  redirectUri: string;
}

const env = import.meta.env as Partial<Record<string, string>>;

export const oidcConfig: OidcConfig = {
  issuer: env.VITE_OIDC_ISSUER_URL ?? 'http://127.0.0.1:8180/realms/slay-drip',
  clientId: env.VITE_OIDC_CLIENT_ID ?? 'slay-drip-pwa',
  audience: env.VITE_OIDC_AUDIENCE ?? 'slay-drip-api',
  redirectUri: env.VITE_OIDC_REDIRECT_URI ?? 'http://localhost:5173/auth/callback',
};

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  subject: string;
}

interface Pending {
  verifier: string;
  state: string;
  nonce: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token: string;
}

export class AuthError extends Error {}

const PENDING_KEY = 'slaydrip.oidc.pending';
const REFRESH_MARGIN_MS = 30_000;

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 48 random bytes encode to exactly 64 characters, inside the 43 to 128 range of RFC 7636.
export function randomToken(bytes = 48): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

export async function codeChallengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

function endpoint(path: string): string {
  return `${oidcConfig.issuer}/protocol/openid-connect/${path}`;
}

// Sends the person to the sign-in form, or to the registration form on the same realm.
export async function startSignIn(flow: 'login' | 'register'): Promise<void> {
  const pending: Pending = {
    verifier: randomToken(),
    state: randomToken(16),
    nonce: randomToken(16),
  };
  storePending(pending);
  const params = new URLSearchParams({
    client_id: oidcConfig.clientId,
    redirect_uri: oidcConfig.redirectUri,
    response_type: 'code',
    scope: 'openid',
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: await codeChallengeFor(pending.verifier),
    code_challenge_method: 'S256',
  });
  const path = flow === 'register' ? 'registrations' : 'auth';
  window.location.assign(`${endpoint(path)}?${params.toString()}`);
}

// Finishes the redirect from the provider. Throws AuthError when the state, nonce or code does not match.
export async function completeSignIn(search: string): Promise<Session> {
  const params = new URLSearchParams(search);
  const pending = takePending();
  if (params.get('error')) throw new AuthError('provider_refused');
  const code = params.get('code');
  if (!code || !pending || params.get('state') !== pending.state) {
    throw new AuthError('state_mismatch');
  }

  const response = await fetch(endpoint('token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: oidcConfig.redirectUri,
      client_id: oidcConfig.clientId,
      code_verifier: pending.verifier,
    }),
  });
  if (!response.ok) throw new AuthError('token_failed');
  const tokens = (await response.json()) as TokenResponse;
  const claims = decodeClaims(tokens.id_token);
  if (claims.nonce !== pending.nonce || typeof claims.sub !== 'string') {
    throw new AuthError('nonce_mismatch');
  }
  setSession(toSession(tokens, claims.sub));
  return current as Session;
}

// Returns a token that is valid for at least the refresh margin, refreshing it when needed.
export async function getAccessToken(): Promise<string | null> {
  if (!current) return null;
  if (current.expiresAt - REFRESH_MARGIN_MS > Date.now()) return current.accessToken;
  const response = await fetch(endpoint('token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: current.refreshToken,
      client_id: oidcConfig.clientId,
    }),
  });
  if (!response.ok) {
    setSession(null);
    return null;
  }
  const tokens = (await response.json()) as TokenResponse;
  setSession(toSession(tokens, current.subject));
  return current.accessToken;
}

export function signOut(): void {
  setSession(null);
}

// Session store for React. Components read it with useSession().
let current: Session | null = null;
const listeners = new Set<() => void>();

export function getSession(): Session | null {
  return current;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSession(next: Session | null): void {
  current = next;
  listeners.forEach((listener) => listener());
}

function toSession(tokens: TokenResponse, subject: string): Session {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    subject,
  };
}

function storePending(pending: Pending): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Storage is blocked, so the redirect cannot be completed. The callback reports state_mismatch.
  }
}

function takePending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

// Reads the claims of an ID token for the nonce and subject. The API verifies the signature.
function decodeClaims(idToken: string): Record<string, unknown> {
  const payload = idToken.split('.')[1] ?? '';
  const padded = payload
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(payload.length / 4) * 4, '=');
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}
