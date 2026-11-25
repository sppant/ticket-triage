import { defineConfig, devices } from '@playwright/test';

const API_PORT = 3101;
const WEB_PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // The real API from the repo root, using the deterministic fake provider.
      command: 'npm run build && npm start',
      cwd: '..',
      env: {
        TRIAGE_PROVIDER: 'fake',
        PORT: String(API_PORT),
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
      },
      url: `http://localhost:${API_PORT}/docs-json`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run build && npm start',
      env: {
        PORT: String(WEB_PORT),
        NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
      },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
