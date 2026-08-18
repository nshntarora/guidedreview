import { expect, reviewUrl, test } from "./fixtures";

test.describe("CLI settings", () => {
  test("saves an API key and keeps it after reload", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer, "settings"), { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("combobox", { name: /provider/i })).toBeVisible();
    await page.getByLabel("API Key").fill("sk-e2e-aaaa");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("API Key")).toHaveAttribute("placeholder", /aaaa/);
  });

  test("Settings and About navigate via hash", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer, "settings"), { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("combobox", { name: /provider/i })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Settings" })
      .getByRole("link", { name: "About" })
      .click();
    await expect(page).toHaveURL(/#about/);
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    await expect(page.getByText(/Local walkthrough of a branch/i)).toBeVisible();

    await page
      .getByRole("navigation", { name: "Settings" })
      .getByRole("link", { name: "Settings" })
      .click();
    await expect(page).toHaveURL(/#settings/);
    await expect(page.getByRole("combobox", { name: /provider/i })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("settings-modal")).toHaveCount(0);
    await expect(page.getByTestId("structure-review")).toBeVisible();
  });
});
