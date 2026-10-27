// Step definitions for tests/features/local-keycloak-stack.feature (S1-03.06).
// HTTP uses the Playwright request API. docker compose runs as a child process. No browser is opened.
import { expect, test, type TestInfo } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import {
  composePs,
  composeArgsFrom,
  composeServices,
  discoveryUrl,
  keycloakConfig,
  readRealmFile,
  runCompose,
} from '../support/keycloak-stack';

const { Given, When, Then } = createBdd();

interface StackResponses {
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

// Fails at once when compose has no keycloak service (the composePs call rejects), then waits for the healthcheck.
async function waitForKeycloakHealthy(): Promise<void> {
  await composePs('keycloak');
  await expect
    .poll(async () => (await composePs('keycloak'))[0]?.Health ?? '', {
      timeout: 180_000,
      intervals: [1_000, 2_000, 5_000],
    })
    .toBe('healthy');
}

Given('the local stack is stopped', async () => {
  // Stops and removes only the keycloak service. The database and object storage keep running,
  // because the up scenario checks that they are still running after compose up.
  await runCompose(['rm', '--stop', '--force', 'keycloak'], 300_000);
});

// playwright-bdd needs an object pattern as the first argument. This step uses no fixture, so the pattern is empty.
// eslint-disable-next-line no-empty-pattern
When('I run {string} from the repo root', async ({}, command: string) => {
  // An image pull on the first run can take minutes, so the test gets more time than the default.
  test.setTimeout(900_000);
  await runCompose(composeArgsFrom(command), 600_000);
});

Then('the keycloak service is running and reports healthy', async () => {
  await expect
    .poll(
      async () => {
        const [container] = await composePs('keycloak');
        return container ? `${container.State}/${container.Health}` : 'not created';
      },
      { timeout: 180_000, intervals: [1_000, 2_000, 5_000] },
    )
    .toBe('running/healthy');
});

Then('keycloak listens on 127.0.0.1 only', async () => {
  const [container] = await composePs('keycloak');
  const publishers = (container?.Publishers ?? []).filter(
    (publisher) => publisher.PublishedPort > 0,
  );
  expect(publishers.length, 'keycloak publishes at least one port').toBeGreaterThan(0);
  for (const publisher of publishers) {
    expect(publisher.URL, `published binding on port ${publisher.PublishedPort}`).toBe('127.0.0.1');
  }
  const issuerPort = new URL(keycloakConfig().issuerUrl).port;
  expect(publishers.map((publisher) => String(publisher.PublishedPort))).toContain(issuerPort);
});

Then('the database and object-storage services are still running', async () => {
  for (const service of ['database', 'object-storage']) {
    const [container] = await composePs(service);
    expect(container?.State, `${service} state`).toBe('running');
  }
});

Then('keycloak has no named volume', async () => {
  const services = await composeServices();
  const keycloak = services.keycloak;
  expect(keycloak, 'keycloak is defined in compose.yaml').toBeDefined();
  const namedVolumes = (keycloak?.volumes ?? []).filter((volume) => volume.type === 'volume');
  expect(namedVolumes.length, 'named volumes on keycloak').toBe(0);
});

Given('the keycloak service is healthy', async () => {
  await waitForKeycloakHealthy();
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
