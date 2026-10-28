import { defineConfig, devices } from '@playwright/test';
import { defineBddProject } from 'playwright-bdd';

const APP_URL = 'http://localhost:5173';
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
  webServer: {
    command: 'npm run dev',
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
  },
});
