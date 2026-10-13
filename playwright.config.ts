import { defineConfig, devices } from '@playwright/test';

const pages = process.env.PAGES_TEST === '1';
const port = pages ? 4174 : 4173;
const baseURL = `http://127.0.0.1:${port}${pages ? '/the-fifth-season/' : '/'}`;
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  testIgnore: pages ? [/audio\.spec\.ts/, /failures\.spec\.ts/] : /pages\.spec\.ts/,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: pages ? 'node scripts/serve-pages.mjs' : 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', testIgnore: pages ? [/iphone\.spec\.ts/, /audio\.spec\.ts/, /failures\.spec\.ts/] : [/iphone\.spec\.ts/, /pages\.spec\.ts/], use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: 'iphone-small-webkit', testMatch: /iphone\.spec\.ts/, use: { ...devices['iPhone SE'], browserName: 'webkit', viewport: { width: 320, height: 568 } } },
  ],
});
