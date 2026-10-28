// Stands in for the identity provider and the API for the signed-in acceptance scenarios.
// Keycloak is replaced by route interception: the authorization request redirects straight back with a code,
// and the token request checks the PKCE verifier against the challenge the app sent. The API is an in-memory stub.
// The live local stack (docker compose, ADR-0010) is checked separately by the smoke scripts.
import { createHash, randomUUID } from 'node:crypto';
import type { Page, Route } from '@playwright/test';

const ISSUER_PATTERN = /\/realms\/slay-drip\/protocol\/openid-connect\/(auth|registrations)(\?|$)/;
const TOKEN_PATTERN = /\/realms\/slay-drip\/protocol\/openid-connect\/token$/;
const API_PATTERN = /^http:\/\/127\.0\.0\.1:8080\//;
const APP_ORIGIN = 'http://localhost:5173';
const AUTH_CODE = 'stub-code';

export interface StubPhoto {
  id: string;
  number: number;
  addedAt: string;
  bytes: Buffer;
}

export interface ApiRequest {
  method: string;
  path: string;
  authorization: string | null;
}

export interface AccountStub {
  // null means the server has no consent record yet (the API answers 404).
  consentGranted: boolean | null;
  photos: StubPhoto[];
  apiRequests: ApiRequest[];
  flows: ('login' | 'register')[];
  // Set after the token request: true when the verifier matched the challenge the app sent.
  pkceVerified: boolean | null;
  // The S256 challenge from the last authorization request.
  challenge: string | null;
  challengeMethod: string | null;
  accessToken: string;
}

const stubs = new WeakMap<Page, AccountStub>();

function fakeAccessToken(): string {
  // Unsigned token with the audience the app checks. The app only reads the audience; the API verifies signatures.
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ aud: 'slay-drip-api', sub: randomUUID() })}.`;
}

// Installs the routes once per page, before the app navigates. Returns the state that the steps read and change.
export async function accountStub(page: Page): Promise<AccountStub> {
  const existing = stubs.get(page);
  if (existing) {
    return existing;
  }
  const stub: AccountStub = {
    consentGranted: null,
    photos: [],
    apiRequests: [],
    flows: [],
    pkceVerified: null,
    challenge: null,
    challengeMethod: null,
    accessToken: fakeAccessToken(),
  };
  stubs.set(page, stub);
  await page.route(ISSUER_PATTERN, (route) => authorize(stub, route));
  await page.route(TOKEN_PATTERN, (route) => token(stub, route));
  await page.route(API_PATTERN, (route) => api(stub, route));
  return stub;
}

async function authorize(stub: AccountStub, route: Route): Promise<void> {
  const url = new URL(route.request().url());
  stub.flows.push(url.pathname.endsWith('registrations') ? 'register' : 'login');
  stub.pkceVerified = null;
  stub.challenge = url.searchParams.get('code_challenge');
  stub.challengeMethod = url.searchParams.get('code_challenge_method');
  const redirect = new URL(url.searchParams.get('redirect_uri') ?? '');
  redirect.searchParams.set('code', AUTH_CODE);
  redirect.searchParams.set('state', url.searchParams.get('state') ?? '');
  await route.fulfill({ status: 302, headers: { location: redirect.toString() } });
}

async function token(stub: AccountStub, route: Route): Promise<void> {
  const cors = { 'Access-Control-Allow-Origin': APP_ORIGIN };
  const form = new URLSearchParams(route.request().postData() ?? '');
  const verifier = form.get('code_verifier') ?? '';
  const computed = createHash('sha256').update(verifier).digest('base64url');
  stub.pkceVerified = stub.challenge !== null && computed === stub.challenge;
  if (!stub.pkceVerified || form.get('code') !== AUTH_CODE) {
    await route.fulfill({
      status: 400,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant' }),
    });
    return;
  }
  await route.fulfill({
    status: 200,
    headers: cors,
    contentType: 'application/json',
    body: JSON.stringify({ access_token: stub.accessToken, expires_in: 300, token_type: 'Bearer' }),
  });
}

// The multipart body from the app has one part, the photo. Its bytes sit between the blank line after the headers and the closing boundary.
function photoBytesFrom(body: Buffer): Buffer {
  const headerEnd = body.indexOf('\r\n\r\n');
  const bodyEnd = body.lastIndexOf('\r\n--');
  return body.subarray(headerEnd + 4, bodyEnd);
}

async function api(stub: AccountStub, route: Route): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const cors = {
    'Access-Control-Allow-Origin': APP_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  };
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: cors });
    return;
  }
  const authorization = request.headers().authorization ?? null;
  stub.apiRequests.push({ method: request.method(), path: url.pathname, authorization });
  if (authorization !== `Bearer ${stub.accessToken}`) {
    await route.fulfill({ status: 401, headers: cors });
    return;
  }

  const json = (status: number, value: unknown) =>
    route.fulfill({
      status,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify(value),
    });
  const photoMatch = /^\/wardrobe\/items\/([^/]+)(\/photo)?$/.exec(url.pathname);

  if (url.pathname === '/consents/wardrobe-photos' && request.method() === 'GET') {
    if (stub.consentGranted === null) {
      await json(404, { error: 'not_found' });
      return;
    }
    await json(200, { granted: stub.consentGranted, wordingVersion: 1 });
    return;
  }
  if (url.pathname === '/consents/wardrobe-photos' && request.method() === 'PUT') {
    const body = JSON.parse(request.postData() ?? '{}') as { granted: boolean };
    stub.consentGranted = body.granted;
    if (!body.granted) {
      stub.photos = [];
    }
    await json(200, { granted: body.granted, wordingVersion: 1 });
    return;
  }
  if (url.pathname === '/wardrobe/items' && request.method() === 'GET') {
    await json(
      200,
      stub.photos.map(({ id, number, addedAt }) => ({ id, number, addedAt })),
    );
    return;
  }
  if (url.pathname === '/wardrobe/items' && request.method() === 'POST') {
    const photo: StubPhoto = {
      id: randomUUID(),
      number: stub.photos.length + 1,
      addedAt: new Date().toISOString(),
      bytes: photoBytesFrom(request.postDataBuffer() ?? Buffer.alloc(0)),
    };
    stub.photos.push(photo);
    await json(201, { id: photo.id, number: photo.number, addedAt: photo.addedAt });
    return;
  }
  if (photoMatch && photoMatch[2] && request.method() === 'GET') {
    const photo = stub.photos.find((candidate) => candidate.id === photoMatch[1]);
    if (!photo) {
      await route.fulfill({ status: 404, headers: cors });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: cors,
      contentType: 'image/jpeg',
      body: photo.bytes,
    });
    return;
  }
  if (photoMatch && !photoMatch[2] && request.method() === 'DELETE') {
    stub.photos = stub.photos.filter((candidate) => candidate.id !== photoMatch[1]);
    await route.fulfill({ status: 204, headers: cors });
    return;
  }
  await route.fulfill({ status: 404, headers: cors });
}

// Seeds synthetic bytes as photos already on the account. They are not real images and contain no personal data.
export async function seedAccountPhotos(page: Page, count: number): Promise<void> {
  const stub = await accountStub(page);
  for (let index = 0; index < count; index++) {
    const number = stub.photos.length + 1;
    stub.photos.push({
      id: randomUUID(),
      number,
      addedAt: new Date(Date.UTC(2026, 0, 1, 0, number)).toISOString(),
      bytes: Buffer.from(`synthetic-photo-${number}`),
    });
  }
}
