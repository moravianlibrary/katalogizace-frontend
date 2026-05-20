/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { loadE2EEnv } from './e2e/support/load-env';

loadE2EEnv();

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:4200';
const authFile = path.join(process.cwd(), 'playwright/.auth/user.json');
const useExistingServer = process.env['E2E_USE_EXISTING_SERVER'] === 'true';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  workers: 1,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
  ],
  webServer: useExistingServer
    ? undefined
    : {
        command: 'npm run start -- --host 127.0.0.1 --port 4200',
        url: baseURL,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      },
});
