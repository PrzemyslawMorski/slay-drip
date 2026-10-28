// Step definitions for tests/features/hard-rule-no-aws.feature (S1-03.10).
// A read-only, case-insensitive search of the local identity stack for AWS references. It reads compose.yaml,
// docs/local-development.md and scripts/dev/keycloak_smoke.py as files, and the infra/dev/keycloak folder recursively.
// It does not scan scripts/dev/s3_smoke.py. No browser is opened, and no docker command or HTTP call is made.
// No .env file is read. A hit is reported as file and line with the token only, never the line's text.
import { expect, test, type TestInfo } from '@playwright/test';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createBdd } from 'playwright-bdd';
import { REPO_ROOT } from '../support/keycloak-stack';

const { Given, When, Then } = createBdd();

// The tokens the scan looks for (CLAUDE.md, Platform decisions). Matching ignores case.
const FORBIDDEN_TOKENS = ['amazonaws', 'aws-sdk', 'awscli', 'aws cli', 'AWS_'];

// The files the scan reads, relative to the repo root.
const SCANNED_FILES = [
  'compose.yaml',
  'docs/local-development.md',
  'scripts/dev/keycloak_smoke.py',
];

// The folders the scan reads recursively, relative to the repo root.
const SCANNED_FOLDERS = ['infra/dev/keycloak'];

// The file texts read by the Given step, used by the When step of the same scenario.
const scannedText = new WeakMap<TestInfo, Map<string, string>>();
// The hits from the When step, read by the Then step of the same scenario.
const scanHits = new WeakMap<TestInfo, string[]>();

async function statOrNull(rel: string) {
  try {
    return await stat(path.join(REPO_ROOT, rel));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function toRepoPath(absolute: string): string {
  return path.relative(REPO_ROOT, absolute).split(path.sep).join('/');
}

Given(
  /^compose\.yaml, the infra\/dev\/keycloak folder, scripts\/dev\/keycloak_smoke.py and docs\/local-development\.md are present$/,
  async () => {
    const texts = new Map<string, string>();
    const missing: string[] = [];

    for (const file of SCANNED_FILES) {
      const info = await statOrNull(file);
      if (info === null || !info.isFile()) {
        missing.push(file);
        continue;
      }
      texts.set(file, await readFile(path.join(REPO_ROOT, file), 'utf8'));
    }

    for (const folder of SCANNED_FOLDERS) {
      const info = await statOrNull(folder);
      if (info === null || !info.isDirectory()) {
        missing.push(folder);
        continue;
      }
      const files = await listFiles(path.join(REPO_ROOT, folder));
      if (files.length === 0) {
        missing.push(`${folder} (no files)`);
      }
      for (const absolute of files) {
        texts.set(toRepoPath(absolute), await readFile(absolute, 'utf8'));
      }
    }

    expect(missing, 'identity stack paths the AWS scan reads').toEqual([]);
    scannedText.set(test.info(), texts);
  },
);

When('I search them for AWS resource, SDK or CLI references', () => {
  const texts = scannedText.get(test.info());
  if (texts === undefined) {
    throw new Error('The identity stack files have not been read in this scenario');
  }
  const hits: string[] = [];
  for (const [file, text] of texts) {
    text.split(/\r?\n/).forEach((line, index) => {
      const lower = line.toLowerCase();
      for (const token of FORBIDDEN_TOKENS) {
        if (lower.includes(token.toLowerCase())) {
          hits.push(`${file}:${index + 1} contains "${token}"`);
        }
      }
    });
  }
  scanHits.set(test.info(), hits);
});

// The tokens named in the scenario's Then step, in quotes, in order. The step has no fixture, so the pattern is empty.
// eslint-disable-next-line no-empty-pattern
Then(/^none of them contains (.+)$/, ({}, listed: string) => {
  const named = [...listed.matchAll(/"([^"]*)"/g)].map((match) => match[1] ?? '');
  expect(named, 'forbidden tokens named in the scenario').toEqual(FORBIDDEN_TOKENS);

  const hits = scanHits.get(test.info());
  if (hits === undefined) {
    throw new Error('The AWS scan has not run in this scenario');
  }
  expect(hits, 'AWS references in the identity stack files').toEqual([]);
});
