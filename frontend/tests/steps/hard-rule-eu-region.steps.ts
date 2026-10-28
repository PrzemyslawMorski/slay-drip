// Step definitions for tests/features/hard-rule-eu-region.feature (S1-03.09).
// A read-only scan of three committed files. It finds region values (*_REGION and region keys), Scaleway hosts
// (*.scw.cloud) and other Scaleway region names, then compares them with the allowed list. It checks values, not
// wording. No browser is opened, and no HTTP call or docker command is made. No .env file is read.
import { expect, test, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createBdd } from 'playwright-bdd';
import { REPO_ROOT } from '../support/keycloak-stack';

const { Given, When, Then } = createBdd();

// The regions allowed by CLAUDE.md (hard rule 3). The test allows all three and picks none.
const ALLOWED_REGIONS = ['fr-par', 'nl-ams', 'pl-waw'];

// Other Scaleway regions that must not be named in these files. The name check also flags any region-shaped token
// on a Scaleway, region or host line, so a region missing from this list is still caught.
const OTHER_SCALEWAY_REGIONS = ['it-mil'];

// The three files the scan reads, relative to the repo root.
const SCANNED_FILES = [
  'compose.yaml',
  'infra/dev/keycloak/realm/slay-drip-realm.json',
  'scripts/dev/keycloak_smoke.py',
];

// A Scaleway region name, such as fr-par, with an optional trailing digit.
const REGION_SHAPE = /\b([a-z]{2}-[a-z]{3}\d?)\b/gi;
const REGION_LABEL = /^[a-z]{2}-[a-z]{3}\d?$/i;
// A host ending in .scw.cloud. The captured prefix holds its labels, such as "s3.fr-par".
const SCALEWAY_HOST = /([a-z0-9-]+(?:\.[a-z0-9-]+)*)\.scw\.cloud\b/gi;
// A region key (*_REGION or region) with its value. The value may be a ${VAR:-default} expression, which is unwrapped below.
const REGION_KEY_VALUE =
  /["']?\b([a-z0-9_]*_region|region)\b["']?\s*[:=]\s*["']?(\$\{[^}]*\}|[^"'\s,#}]*)/gi;

interface ScanResult {
  // Region values and host region labels that are not on the allowed list.
  valueViolations: string[];
  // Other Scaleway region names found anywhere in the scanned files.
  nameViolations: string[];
  regionValuesSeen: number;
  hostsSeen: number;
}

// The contents read by the Given step, used by the When step of the same scenario.
const scannedText = new WeakMap<TestInfo, Map<string, string>>();
// The scan result from the When step, read by the Then steps of the same scenario.
const scanResults = new WeakMap<TestInfo, ScanResult>();

// For ${VAR:-default}, the value is the default. A bare ${VAR} has no default, so it stays as written and fails the check.
function effectiveRegion(raw: string): string {
  const withDefault = /^\$\{[^:}]*:-([^}]*)\}$/.exec(raw);
  return withDefault ? (withDefault[1] ?? '') : raw;
}

function scanFile(file: string, text: string, result: ScanResult): void {
  text.split(/\r?\n/).forEach((line, index) => {
    const where = `${file}:${index + 1}`;

    for (const match of line.matchAll(REGION_KEY_VALUE)) {
      result.regionValuesSeen += 1;
      const value = effectiveRegion(match[2] ?? '');
      if (!ALLOWED_REGIONS.includes(value)) {
        result.valueViolations.push(`${where} ${match[1]} is "${value}"`);
      }
    }

    for (const match of line.matchAll(SCALEWAY_HOST)) {
      result.hostsSeen += 1;
      const labels = (match[1] ?? '').split('.');
      const regionLabels = labels.filter((label) => REGION_LABEL.test(label));
      if (regionLabels.length === 0) {
        result.valueViolations.push(`${where} Scaleway host "${match[0]}" names no region`);
      }
      for (const label of regionLabels) {
        if (!ALLOWED_REGIONS.includes(label.toLowerCase())) {
          result.valueViolations.push(`${where} Scaleway host "${match[0]}" names "${label}"`);
        }
      }
    }

    const scalewayContext = /scw|scaleway|region/i.test(line);
    for (const match of line.matchAll(REGION_SHAPE)) {
      const name = (match[1] ?? '').toLowerCase();
      const otherRegion = OTHER_SCALEWAY_REGIONS.includes(name);
      const unlistedInContext = scalewayContext && !ALLOWED_REGIONS.includes(name);
      if (otherRegion || unlistedInContext) {
        result.nameViolations.push(`${where} names "${name}"`);
      }
    }
  });
}

Given(
  /^the files compose\.yaml, infra\/dev\/keycloak\/realm\/slay-drip-realm\.json and scripts\/dev\/keycloak_smoke.py are present$/,
  async () => {
    const texts = new Map<string, string>();
    const missing: string[] = [];
    for (const file of SCANNED_FILES) {
      try {
        texts.set(file, await readFile(path.join(REPO_ROOT, file), 'utf8'));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        missing.push(file);
      }
    }
    expect(missing, 'files the EU-region scan reads').toEqual([]);
    scannedText.set(test.info(), texts);
  },
);

// The When step has no fixture, so the pattern is empty.
// eslint-disable-next-line no-empty-pattern
When('I read every region value and every Scaleway host in those files', ({}) => {
  const texts = scannedText.get(test.info());
  if (texts === undefined) {
    throw new Error('The scanned files have not been read in this scenario');
  }
  const result: ScanResult = {
    valueViolations: [],
    nameViolations: [],
    regionValuesSeen: 0,
    hostsSeen: 0,
  };
  for (const [file, text] of texts) {
    scanFile(file, text, result);
  }
  scanResults.set(test.info(), result);
});

function recordedScan(): ScanResult {
  const result = scanResults.get(test.info());
  if (result === undefined) {
    throw new Error('The EU-region scan has not run in this scenario');
  }
  return result;
}

Then('every value is one of fr-par, nl-ams or pl-waw', () => {
  expect(
    recordedScan().valueViolations,
    'region values and Scaleway host regions outside fr-par, nl-ams and pl-waw',
  ).toEqual([]);
});

Then('no file names any other Scaleway region', () => {
  expect(
    recordedScan().nameViolations,
    'Scaleway region names outside fr-par, nl-ams and pl-waw',
  ).toEqual([]);
});
