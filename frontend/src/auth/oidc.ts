// OIDC authorization code flow with PKCE S256 against the identity provider (ADR-0010).
import { config } from '../config';
import { codeChallengeFor, randomVerifier } from './pkce';
import { setSession } from './session';

const PENDING_KEY = 'slay-drip.oidc-pending';

export class SignInError extends Error {
  constructor() {
    super('Sign-in failed');
    this.name = 'SignInError';
  }
}

interface PendingSignIn {
  state: string;
  verifier: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

function isTokenResponse(value: unknown): value is TokenResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.access_token === 'string' && typeof candidate.expires_in === 'number';
}

function isPendingSignIn(value: unknown): value is PendingSignIn {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.state === 'string' && typeof candidate.verifier === 'string';
}

// Reads the audience claim of an access token. This is a sanity check on what the provider issued,
// not verification: the API verifies the signature, issuer and audience (BE-40, BE-41).
export function audienceIncludes(accessToken: string, audience: string): boolean {
  const payload = accessToken.split('.')[1];
  if (!payload) {
    return false;
  }
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      aud?: unknown;
    };
    const aud = claims.aud;
    return Array.isArray(aud) ? aud.includes(audience) : aud === audience;
  } catch {
    return false;
  }
}

// Sends the person to the provider's login page, or to its registration page for a new account.
export async function startSignIn(flow: 'login' | 'register'): Promise<void> {
  const verifier = randomVerifier();
  const state = randomVerifier();
  const pending: PendingSignIn = { state, verifier };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  const endpoint = flow === 'register' ? 'registrations' : 'auth';
  const url = new URL(`${config.oidc.issuerUrl}/protocol/openid-connect/${endpoint}`);
  url.search = new URLSearchParams({
    client_id: config.oidc.clientId,
    redirect_uri: config.oidc.redirectUri,
    response_type: 'code',
    scope: 'openid',
    state,
    code_challenge: await codeChallengeFor(verifier),
    code_challenge_method: 'S256',
  }).toString();
  window.location.assign(url.toString());
}

// Finishes the flow on the callback page: checks state, exchanges the code with the PKCE verifier,
// and keeps the tokens in memory.
export async function completeSignIn(callbackUrl: URL): Promise<void> {
  const stored = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  if (stored === null) {
    throw new SignInError();
  }
  const pending: unknown = JSON.parse(stored);
  if (!isPendingSignIn(pending)) {
    throw new SignInError();
  }
  const code = callbackUrl.searchParams.get('code');
  if (code === null || callbackUrl.searchParams.get('state') !== pending.state) {
    throw new SignInError();
  }

  const response = await fetch(`${config.oidc.issuerUrl}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.oidc.redirectUri,
      client_id: config.oidc.clientId,
      code_verifier: pending.verifier,
    }),
  });
  if (!response.ok) {
    throw new SignInError();
  }
  const tokens: unknown = await response.json();
  if (!isTokenResponse(tokens) || !audienceIncludes(tokens.access_token, config.oidc.audience)) {
    throw new SignInError();
  }
  setSession({
    accessToken: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
}
