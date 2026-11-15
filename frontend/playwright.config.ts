import { defineConfig, devices } from '@playwright/test';
import { defineBddProject } from 'playwright-bdd';
import { readStack } from './tests/support/stack';

// The app under test is this worktree's own web service (ADR-0016, S1-08.12). Its URL comes from the stack file that
// scripts/dev/up.py writes. The config starts no server, so a run never reaches another worktree's code. If the stack
// file is missing, loading the config fails with the start command.
const APP_URL = readStack().urls.host.web;
const STEPS = ['tests/steps/**/*.ts', 'tests/support/**/*.ts'];

// Scenarios that start, stop or restart the shared local stack run first, one at a time.
// Everything else only reads the stack, so it runs in parallel after they finish.
const stackLifecycle = defineBddProject({
  name: 'stack-lifecycle',
  features: 'tests/features/**/*.feature',
  tags: '@stack-lifecycle',
  steps: STEPS,
  outputDir: '.features-gen/stack-lifecycle',
});

const parallel = defineBddProject({
  name: 'parallel',
  features: 'tests/features/**/*.feature',
  tags: 'not @stack-lifecycle',
  steps: STEPS,
  outputDir: '.features-gen/parallel',
});

export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: APP_URL,
    trace: 'retain-on-failure',
    // Recording mode (recorded-browser-run-as-proof skill) keeps a video of every scenario, not only failures.
    video: process.env.PROOF_RECORDING ? 'on' : 'retain-on-failure',
  },
  projects: [
    {
      ...stackLifecycle,
      fullyParallel: false,
      workers: 1,
    },
    {
      ...parallel,
      name: 'mobile-chromium',
      dependencies: ['stack-lifecycle'],
      use: { ...devices['Pixel 7'] },
    },
  ],
});
