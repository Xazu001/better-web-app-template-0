import { defineConfig, devices } from "@playwright/test";

if (process.env.CLOUDFLARE_ENV && process.env.CLOUDFLARE_ENV !== "local") {
  throw new Error(
    "E2E tests require fully local bindings — only CLOUDFLARE_ENV=local (or unset) is allowed."
  );
}

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: /.*\.e2e\.test\.ts/,
  outputDir: "./test/results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "test/report" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    // A click on a button that is not there must fail, not hold a test open
    // for its whole timeout (the hardware test ran into that).
    actionTimeout: 30000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "pnpm dev:local",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    timeout: 120 * 1000
  }
});
