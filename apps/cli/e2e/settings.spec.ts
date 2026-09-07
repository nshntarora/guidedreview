import { expect, reviewUrl, test } from "./fixtures";

test.describe("CLI settings", () => {
  test("saves an API key and keeps it after reload", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer, "settings"), { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("settings-provider")).toBeVisible();
    await page.getByTestId("settings-api-key").fill("sk-e2e-aaaa");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("settings-status")).toHaveText("Saved");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-api-key")).toHaveAttribute("placeholder", /aaaa/);
  });

  test("Settings and About navigate via hash", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer, "settings"), { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-provider")).toBeVisible();

    await page.getByTestId("settings-nav-about").click();
    await expect(page).toHaveURL(/#about/);
    await expect(page.getByTestId("settings-modal")).toBeVisible();

    await page.getByTestId("settings-nav-settings").click();
    await expect(page).toHaveURL(/#settings/);
    await expect(page.getByTestId("settings-provider")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("settings-modal")).toHaveCount(0);
    await expect(page.getByTestId("structure-review")).toBeVisible();
  });
});
