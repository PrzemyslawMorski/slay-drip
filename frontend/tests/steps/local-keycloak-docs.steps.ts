// Step definitions for tests/features/local-keycloak-docs.feature (S1-03.08).
// The steps read docs/local-development.md as text and check that the Keycloak section, the config contract rows
// and the troubleshooting entries are present. They check presence, not wording. No browser is opened, and no HTTP
// call or docker command is made.
import { expect, test, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createBdd } from 'playwright-bdd';
import { REPO_ROOT } from '../support/keycloak-stack';

const { Given, When, Then } = createBdd();

const GUIDE_FILE = path.join(REPO_ROOT, 'docs', 'local-development.md');

// The OIDC and KEYCLOAK keys from docs/specs/S1-03-local-keycloak.md, as listed in S1-03.03.
const CONFIG_CONTRACT_KEYS = [
  'OIDC_ISSUER_URL',
  'OIDC_JWKS_URL',
  'OIDC_CLIENT_ID',
  'OIDC_AUDIENCE',
  'OIDC_REDIRECT_URI',
  'KEYCLOAK_BASE_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_ADMIN_CLIENT_ID',
  'KEYCLOAK_ADMIN_CLIENT_SECRET',
];

// The guide text read by the When step, read by the Then steps of the same scenario.
const guides = new WeakMap<TestInfo, string>();

function recordedGuide(): string {
  const guide = guides.get(test.info());
  if (guide === undefined) {
    throw new Error('docs/local-development.md has not been read in this scenario');
  }
  return guide;
}

// The lines under a level-2 heading, up to the next level-2 heading. Undefined when no heading matches.
function sectionLines(markdown: string, heading: RegExp): string[] | undefined {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^## /.test(line) && heading.test(line));
  if (start === -1) {
    return undefined;
  }
  const next = lines.findIndex((line, index) => index > start && /^## /.test(line));
  return lines.slice(start + 1, next === -1 ? undefined : next);
}

// The cells of the table row whose first cell is the given key in backticks. Undefined when no row matches.
function configRowCells(sectionLinesIn: string[], key: string): string[] | undefined {
  for (const line of sectionLinesIn) {
    if (!line.trim().startsWith('|')) {
      continue;
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells[0] === `\`${key}\``) {
      return cells;
    }
  }
  return undefined;
}

// Each troubleshooting topic, and the test for one entry that covers it. The entry must name Keycloak or its port.
const TROUBLESHOOTING_TOPICS: { name: string; covers: (entry: string) => boolean }[] = [
  {
    name: 'the port',
    covers: (entry) => /port/i.test(entry) && /8180|keycloak/i.test(entry),
  },
  {
    name: 'the realm not re-importing',
    covers: (entry) => /realm/i.test(entry) && /import/i.test(entry),
  },
  {
    name: 'the image tag check',
    covers: (entry) => /image/i.test(entry) && /tag/i.test(entry),
  },
];

Given('the Keycloak service and the smoke script are merged', async () => {
  // The merge state belongs to S1-03.01 and S1-03.02, and their own scenarios check it. This step only checks that
  // the guide can be read, so the scenario's red reason stays the missing Keycloak content.
  await readFile(GUIDE_FILE, 'utf8');
});

// A regular expression, because a Cucumber expression reads the "/" in the path as an alternative.
When(/^I read docs\/local-development\.md$/, async () => {
  guides.set(test.info(), await readFile(GUIDE_FILE, 'utf8'));
});

Then('it has a Keycloak section with the start and smoke commands', () => {
  const section = sectionLines(recordedGuide(), /^## .*(keycloak|identity)/i);
  expect(section, 'a level-2 heading that names Keycloak or the identity stand-in').toBeDefined();
  const text = (section ?? []).join('\n');
  expect(text, 'the Keycloak section gives the start command').toMatch(/docker compose up/);
  expect(text, 'the Keycloak section gives the smoke command').toMatch(
    /scripts\/dev\/keycloak_smoke.py/,
  );
});

Then(
  'the config contract lists each OIDC and KEYCLOAK key with a local value and a Scaleway value',
  () => {
    const contract = sectionLines(recordedGuide(), /^## Config contract\s*$/);
    expect(contract, 'a "## Config contract" section').toBeDefined();
    const missing = CONFIG_CONTRACT_KEYS.filter((key) => {
      const cells = configRowCells(contract ?? [], key);
      // Columns: key, local value, Scaleway value. Both values must be filled in.
      return cells === undefined || cells.length < 3 || cells[1] === '' || cells[2] === '';
    });
    expect(
      missing,
      'config contract rows missing a key, a local value or a Scaleway value',
    ).toEqual([]);
  },
);

Then(
  'the troubleshooting section covers the port, the realm not re-importing, and the image tag check',
  () => {
    const troubleshooting = sectionLines(recordedGuide(), /^## Troubleshooting\s*$/);
    expect(troubleshooting, 'a "## Troubleshooting" section').toBeDefined();
    const entries = (troubleshooting ?? []).filter((line) => line.trim() !== '');
    const uncovered = TROUBLESHOOTING_TOPICS.filter(
      (topic) => !entries.some((entry) => topic.covers(entry)),
    ).map((topic) => topic.name);
    expect(uncovered, 'troubleshooting topics with no Keycloak entry').toEqual([]);
  },
);
