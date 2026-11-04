import { defineConfig, devices } from '@playwright/test';

const externalWebUrl = process.env.MIDCV_E2E_WEB_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: externalWebUrl || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: externalWebUrl ? undefined : {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
