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
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : {}),
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node server/test/e2e-server.js",
      env: { E2E_PORT: String(apiPort), CLIENT_ORIGIN: webOrigin },
      url: `${apiOrigin}/api/auth/me`,
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: `npm run dev --prefix client -- --host 127.0.0.1 --port ${webPort}`,
      env: { VITE_PROXY_TARGET: apiOrigin },
      url: webOrigin,
      timeout: 30000,
      reuseExistingServer: false,
    },
  ],
});
