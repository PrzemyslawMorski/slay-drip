import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Optimize workers for parallel execution */
  workers: process.env.CI ? 2 : '75%',
  /* Global timeout for all tests */
  globalTimeout: 30 * 60 * 1000, // 30 minutes
  /* Timeout per test */
  timeout: 60 * 1000, // 60 seconds per test
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3001',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot only on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers - Chromium
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // Desktop browsers - Firefox
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Desktop browsers - WebKit/Safari
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Tablet testing
    {
      name: 'tablet-chrome',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 }
      },
    },

    {
      name: 'tablet-safari',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 }
      },
    },

    // Mobile testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 }
      },
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 }
      },
    },

    // Additional responsive breakpoints
    {
      name: 'small-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 }
      },
    },

    {
      name: 'large-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 414, height: 896 }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});