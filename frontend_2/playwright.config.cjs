const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5189', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5189 --strictPort', url: 'http://127.0.0.1:5189', timeout: 30000, reuseExistingServer: false },
});
