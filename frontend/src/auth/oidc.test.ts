import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthError,
  base64UrlEncode,
  codeChallengeFor,
  completeSignIn,
  getAccessToken,
  getSession,
  randomToken,
  signOut,
  startSignIn,
} from './oidc';

// Test-only fakes. Persona values are synthetic.
function fakeIdToken(claims: Record<string, unknown>): string {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  return `e30.${payload}.signature-not-checked-here`;
}

function stubBrowser() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
  const assign = vi.fn();
  vi.stubGlobal('window', { location: { assign } });
  return { assign, store };
}

afterEach(() => {
  signOut();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PKCE helpers', () => {
  it('derives the S256 challenge from the RFC 7636 example verifier', async () => {
    const challenge = await codeChallengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('makes verifiers of 64 unreserved characters', () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{64}$/);
  });
});

describe('sign-in redirect', () => {
  it('sends the person to the sign-in form with a PKCE S256 challenge', async () => {
    const { assign } = stubBrowser();
    await startSignIn('login');
    const url = new URL(assign.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/realms/slay-drip/protocol/openid-connect/auth');
    expect(url.searchParams.get('client_id')).toBe('slay-drip-pwa');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('sends the person to the registration form for create account', async () => {
    const { assign } = stubBrowser();
    await startSignIn('register');
    const url = new URL(assign.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/realms/slay-drip/protocol/openid-connect/registrations');
  });
});

describe('callback', () => {
  it('rejects a callback whose state does not match the request it started', async () => {
    stubBrowser();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(completeSignIn('?code=abc&state=not-the-state')).rejects.toBeInstanceOf(AuthError);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getSession()).toBeNull();
  });

  it('exchanges the code with the verifier that matches the challenge, then holds the session', async () => {
    const { assign, store } = stubBrowser();
    await startSignIn('login');
    const sent = new URL(assign.mock.calls[0][0] as string);
    const pending = JSON.parse(store.get('slaydrip.oidc.pending') ?? '{}') as {
      verifier: string;
      nonce: string;
    };

    const idToken = fakeIdToken({ sub: 'persona-subject-1', nonce: pending.nonce });
    const tokenFetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: 'access-1',
            refresh_token: 'refresh-1',
            expires_in: 300,
            id_token: idToken,
          }),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal('fetch', tokenFetch);

    await completeSignIn(`?code=code-1&state=${sent.searchParams.get('state')}`);

    const body = (tokenFetch.mock.calls[0] as unknown as [string, RequestInit])[1]
      .body as URLSearchParams;
    expect(body.get('code_verifier')).toBe(pending.verifier);
    expect(await codeChallengeFor(body.get('code_verifier') ?? '')).toBe(
      sent.searchParams.get('code_challenge'),
    );
    expect(getSession()?.subject).toBe('persona-subject-1');
    expect(await getAccessToken()).toBe('access-1');
  });
});
