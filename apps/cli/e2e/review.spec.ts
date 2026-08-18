import { commitInRepo, expect, reviewUrl, test } from "./fixtures";

test.describe("CLI review overlay", () => {
  test("boots a file-by-file review from the session token", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });

    const units = page.getByRole("navigation", { name: "Review Units" });
    await expect(units.getByRole("button", { name: /Change summary/i })).toBeVisible();
    await expect(units.getByRole("button", { name: /feat\.ts/ })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /diff to review/i })).toBeVisible();
    await expect(page.getByTestId("structure-review")).toBeVisible();
    await expect(page.getByTestId("guided-review-overlay")).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toHaveCount(0);
  });

  test("missing token shows the boot error", async ({ page, reviewServer }) => {
    await page.goto(reviewServer.baseURL + "/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByText("Missing session token. Open the URL printed by the CLI."),
    ).toBeVisible();
    await expect(page.getByTestId("structure-review")).toHaveCount(0);
  });

  test("Structure with AI without a key opens settings", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("structure-review")).toBeVisible();

    await page.getByTestId("structure-review").click();

    await expect(page).toHaveURL(/#settings/);
    await expect(page.getByTestId("settings-modal")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /provider/i })).toBeVisible();
  });

  test("switching scope reloads the overlay diff", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });

    const units = page.getByRole("navigation", { name: "Review Units" });
    await expect(units.getByRole("button", { name: /feat\.ts/ })).toBeVisible();

    await page.getByRole("combobox", { name: /diff to review/i }).click();
    await page.getByRole("option", { name: /uncommitted changes/i }).click();

    await expect(units.getByRole("button", { name: /dirty\.ts/ })).toBeVisible();
    await expect(units.getByRole("button", { name: /feat\.ts/ })).toHaveCount(0);
  });

  test("stale banner appears and Refresh reloads", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("structure-review")).toBeVisible();
    await expect(page.getByTestId("stale-diff-banner")).toHaveCount(0);

    await commitInRepo(reviewServer.repoDir, "feat.ts", "export const n = 2;\n");

    await expect(page.getByTestId("stale-diff-banner")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^refresh$/i }).click();

    await expect(page.getByTestId("structure-review")).toBeVisible();
    await expect(page.getByTestId("stale-diff-banner")).toHaveCount(0);
  });
});
