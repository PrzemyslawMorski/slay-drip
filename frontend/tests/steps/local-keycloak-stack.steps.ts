// Step definitions for tests/features/local-keycloak-stack.feature (S1-03.06, rewritten in S1-07.15).
// The host starts the stack with "docker compose up -d". These steps only check that the running stack
// answers: HTTP goes through the Playwright request API, TCP probes use node:net, and compose.yaml is read
// as text. No step runs docker compose, and no browser is opened.
import { expect, test, type APIRequestContext, type TestInfo } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import {
  composeFileText,
  composeServiceFacts,
  discoveryUrl,
  isNamedVolume,
  keycloakConfig,
  readRealmFile,
  tcpAnswers,
} from '../support/keycloak-stack';

const { Given, When, Then } = createBdd();

interface StackResponses {
  keycloakStatus?: number;
  serviceAnswers?: Record<string, boolean>;
  discoveryStatus?: number;
  discoveryBody?: Record<string, unknown>;
  jwksStatus?: number;
  pkce?: { status: number; location: string; body: string };
}

// Responses from the When step, read by the Then steps of the same scenario.
const responses = new WeakMap<TestInfo, StackResponses>();

function recordedResponses(testInfo: TestInfo): StackResponses {
  return responses.get(testInfo) ?? {};
}

// The discovery document answers 200 only when keycloak is up and the realm is imported.
// Returns 0 when nothing answers (connection refused), so the caller can report "not running".
async function keycloakStatus(request: APIRequestContext): Promise<number> {
  try {
    const response = await request.get(discoveryUrl(keycloakConfig()));
    return response.status();
  } catch {
    return 0;
  }
}

// Waits up to three minutes for keycloak to answer, because the host command returns before keycloak has
// finished starting. Returns the last status seen; it is 0 when nothing ever answered.
async function waitForKeycloak(request: APIRequestContext): Promise<number> {
  const deadline = Date.now() + 180_000;
  let status = await keycloakStatus(request);
  while (status !== 200 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    status = await keycloakStatus(request);
  }
  return status;
}

// The host ports of one service as written in compose.yaml, for the TCP probes.
async function publishedPorts(service: string): Promise<number[]> {
  const facts = composeServiceFacts(await composeFileText(), service);
  return facts.ports.map((port) => port.hostPort);
}

// playwright-bdd needs an object pattern as the first argument. This step uses no fixture, so the pattern is empty.
// The command is only checked for its shape. The test never runs it.
// eslint-disable-next-line no-empty-pattern
Given('the local stack was started on the host with {string}', ({}, command: string) => {
  expect(command, 'the documented host command').toMatch(/^docker compose /);
});

When('I check the running services', async ({ request }) => {
  // Waits for keycloak to answer, then probes the other two services on their published ports.
  const keycloak = await waitForKeycloak(request);
  const serviceAnswers: Record<string, boolean> = {};
  for (const service of ['database', 'object-storage']) {
    const [port] = await publishedPorts(service);
    serviceAnswers[service] = port !== undefined && (await tcpAnswers('127.0.0.1', port));
  }
  responses.set(test.info(), { keycloakStatus: keycloak, serviceAnswers });
});

Then('the keycloak service is running and reports healthy', () => {
  const status = recordedResponses(test.info()).keycloakStatus ?? 0;
  if (status !== 200) {
    throw new Error(
      `keycloak is not running: no HTTP 200 from ${discoveryUrl(keycloakConfig())} (got ${status || 'no answer'}). ` +
        'Start the stack on the host with "docker compose up -d".',
    );
  }
});

Then('keycloak listens on 127.0.0.1 only', async () => {
  const facts = composeServiceFacts(await composeFileText(), 'keycloak');
  expect(facts.ports.length, 'keycloak publishes at least one port').toBeGreaterThan(0);
  for (const port of facts.ports) {
    expect(port.hostIp, `published binding on port ${port.hostPort}`).toBe('127.0.0.1');
  }
  const issuerPort = Number(new URL(keycloakConfig().issuerUrl).port);
  expect(facts.ports.map((port) => port.hostPort)).toContain(issuerPort);
});

Then('the database and object-storage services are still running', () => {
  const answers = recordedResponses(test.info()).serviceAnswers ?? {};
  for (const service of ['database', 'object-storage']) {
    if (answers[service] !== true) {
      throw new Error(
        `${service} is not running: nothing accepts a connection on its published port. ` +
          'Start the stack on the host with "docker compose up -d".',
      );
    }
  }
});

Then('keycloak has no named volume', async () => {
  const facts = composeServiceFacts(await composeFileText(), 'keycloak');
  const namedVolumes = facts.volumeSources.filter(isNamedVolume);
  expect(namedVolumes, 'named volumes on keycloak').toEqual([]);
});

Given('the keycloak service is healthy', async ({ request }) => {
  const status = await waitForKeycloak(request);
  expect(status, 'keycloak discovery status (0 means no answer: the stack is not running)').toBe(
    200,
  );
});

When(
  'I request the discovery document and the JWKS URL from the config contract',
  async ({ request }) => {
    const config = keycloakConfig();
    const discovery = await request.get(discoveryUrl(config));
    const discoveryBody = discovery.ok()
      ? ((await discovery.json()) as Record<string, unknown>)
      : {};
    const jwks = await request.get(config.jwksUrl);
    responses.set(test.info(), {
      discoveryStatus: discovery.status(),
      discoveryBody,
      jwksStatus: jwks.status(),
    });
  },
);

Then('both respond with HTTP 200', () => {
  const recorded = recordedResponses(test.info());
  expect(recorded.discoveryStatus, 'discovery document status').toBe(200);
  expect(recorded.jwksStatus, 'JWKS URL status').toBe(200);
});

Then('the discovery issuer equals the value of OIDC_ISSUER_URL', () => {
  const body = recordedResponses(test.info()).discoveryBody ?? {};
  expect(body.issuer).toBe(keycloakConfig().issuerUrl);
});

Then('the discovery document gives the JWKS URL equal to OIDC_JWKS_URL', () => {
  const body = recordedResponses(test.info()).discoveryBody ?? {};
  expect(body.jwks_uri).toBe(keycloakConfig().jwksUrl);
});

Then('the discovery document lists S256 as a supported code challenge method', () => {
  const body = recordedResponses(test.info()).discoveryBody ?? {};
  expect(body.code_challenge_methods_supported).toContain('S256');
});

Given('the slay-drip realm is imported', async ({ request }) => {
  const response = await request.get(discoveryUrl(keycloakConfig()));
  expect(response.status(), 'slay-drip realm discovery status').toBe(200);
});

When(
  'an authorization request for client slay-drip-pwa arrives without a code challenge',
  async ({ request }) => {
    const config = keycloakConfig();
    const authUrl = new URL(`${config.issuerUrl}/protocol/openid-connect/auth`);
    authUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid',
      state: 'synthetic-state',
    }).toString();
    // maxRedirects is 0 so that a login form, if one were served, is seen as the response itself.
    const response = await request.get(authUrl.toString(), { maxRedirects: 0 });
    responses.set(test.info(), {
      ...recordedResponses(test.info()),
      pkce: {
        status: response.status(),
        location: response.headers()['location'] ?? '',
        body: await response.text(),
      },
    });
  },
);

Then('the request is refused and no login form is shown', () => {
  const pkce = recordedResponses(test.info()).pkce;
  if (pkce === undefined) {
    throw new Error('No authorization response was recorded for the PKCE check');
  }
  const issuer = keycloakConfig().issuerUrl;
  const redirectedWithError =
    pkce.status >= 300 &&
    pkce.status < 400 &&
    new URL(pkce.location, issuer).searchParams.has('error');
  const refused = pkce.status >= 400 || redirectedWithError;
  expect(refused, `the authorization request was not refused (HTTP ${pkce.status})`).toBe(true);
  expect(pkce.body).not.toContain('kc-form-login');
});

// A regular expression, because a Cucumber expression reads the "/" in the URL as an alternative.
Then(
  /^the redirect URIs of slay-drip-pwa list only paths on http:\/\/localhost:5173$/,
  async () => {
    // Static check of the committed realm file. The admin client cannot read the realm, so the live
    // state is not checked here.
    const realm = await readRealmFile();
    const client = realm.clients?.find((candidate) => candidate.clientId === 'slay-drip-pwa');
    expect(client, 'the realm file defines slay-drip-pwa').toBeDefined();
    const redirectUris = client?.redirectUris ?? [];
    expect(redirectUris.length, 'slay-drip-pwa redirect URIs').toBeGreaterThan(0);
    for (const uri of redirectUris) {
      expect(uri.startsWith('http://localhost:5173/'), `redirect URI ${uri}`).toBe(true);
    }
  },
);
