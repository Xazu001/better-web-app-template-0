import { expect, test } from "@playwright/test";

// Wrong credentials must surface a form error, not a crash or a silent no-op.
// Runs against the local emulated D1 (empty users table → INVALID_PASSWORD).
test("login with unknown credentials shows an error", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("textbox", { name: "Email" }).fill("nobody@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill("wrong-password-123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("Invalid password")).toBeVisible();
});
