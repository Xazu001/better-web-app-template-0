import { defineConfig, devices } from "@playwright/test";

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
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  }
});
