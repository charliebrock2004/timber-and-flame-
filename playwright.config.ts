import { defineConfig, devices } from "@playwright/test";
import { BASE, DOWN_PORT, E2E_DB, PORT, SMTP_PORT, serverEnv } from "./tests/e2e/env";

/**
 * End-to-end tests against a production build (`npm run test:e2e`, which
 * resets a LOCAL test database and builds first). Two servers run the same
 * build: one with the test database, one whose database is unreachable.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: [
    { command: "npx tsx tests/e2e/smtp-sink.ts", port: SMTP_PORT, reuseExistingServer: false },
    { command: `npx next start -p ${PORT}`, url: `${BASE}/`, env: serverEnv(E2E_DB), reuseExistingServer: false, timeout: 120_000 },
    {
      command: `npx next start -p ${DOWN_PORT}`,
      url: `http://localhost:${DOWN_PORT}/robots.txt`,
      // Nothing listens on port 9 — every database call fails.
      env: serverEnv("postgres://tf:tf@127.0.0.1:9/nothing"),
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
