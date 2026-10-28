import { describe, expect, it } from 'vitest';
import { codeChallengeFor, randomVerifier } from './pkce';

describe('randomVerifier', () => {
  it('uses 64 characters from the unreserved set', () => {
    const verifier = randomVerifier();
    expect(verifier).toHaveLength(64);
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('returns a different value each time', () => {
    expect(randomVerifier()).not.toBe(randomVerifier());
  });
});

describe('codeChallengeFor', () => {
  // RFC 7636, appendix B.
  it('matches the S256 test vector from the specification', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(await codeChallengeFor(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});
