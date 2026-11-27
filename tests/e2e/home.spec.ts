import { expect, test } from "@playwright/test";

test("home page renders the app name in Turkish", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.getByRole("heading", { level: 1, name: "Galeri CRM" })).toBeVisible();
});
