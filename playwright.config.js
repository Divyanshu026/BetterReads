const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'node backend/src/demo.js',
      url: 'http://127.0.0.1:5000/health',
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: 'npm --prefix frontend run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      timeout: 30000,
      reuseExistingServer: false,
    },
  ],
});
