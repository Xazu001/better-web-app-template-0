import { expect, test } from "@playwright/test";

// Smoke tests — the pattern to copy for new e2e specs: `*.e2e.test.ts`.
// `pnpm test:e2e` boots `pnpm dev` itself (see `webServer` in playwright.config.ts).

test("home page renders", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("login page renders", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  await expect(page.locator("form").first()).toBeVisible();
});
