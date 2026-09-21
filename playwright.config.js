const { defineConfig } = require("@playwright/test");
const apiPort = Number(process.env.E2E_API_PORT || 5100);
const webPort = Number(process.env.E2E_WEB_PORT || 5174);
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const webOrigin = `http://127.0.0.1:${webPort}`;
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: webOrigin,
    headless: true,
    actionTimeout: 10000,
    launchOptions: {
      executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `E2E_PORT=${apiPort} CLIENT_ORIGIN=${webOrigin} node server/test/e2e-server.js`,
      url: `${apiOrigin}/api/auth/me`,
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: `VITE_PROXY_TARGET=${apiOrigin} npm run dev --prefix client -- --host 127.0.0.1 --port ${webPort}`,
      url: webOrigin,
      timeout: 30000,
      reuseExistingServer: false,
    },
  ],
});
