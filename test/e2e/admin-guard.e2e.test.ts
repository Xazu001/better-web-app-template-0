import { expect, test } from "@playwright/test";

// The admin layout loader must bounce anonymous visitors to /login —
// guards in loaders/actions are the actual security boundary, the UI is not.
test("admin redirects anonymous visitors to login", async ({ page }) => {
  const response = await page.goto("/admin");

  expect(response?.status()).toBeLessThan(400);
  expect(new URL(page.url()).pathname).toBe("/login");
});

test("admin users list redirects anonymous visitors to login", async ({ page }) => {
  await page.goto("/admin/users");

  expect(new URL(page.url()).pathname).toBe("/login");
});
