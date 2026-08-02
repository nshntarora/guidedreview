import { test, expect } from "@playwright/test";
import { CHROME_WEB_STORE_URL, GITHUB_REPO_URL } from "@web/lib/links";

test.describe("landing page", () => {
  test("hero, sections, primary CTAs, and FAQ accordion", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: /review AI generated code/i }),
    ).toBeVisible();

    // Hero install CTA points at the Chrome Web Store with a safe external target.
    const heroInstall = page.getByRole("link", { name: /Install the extension/i }).first();
    await expect(heroInstall).toBeVisible();
    await expect(heroInstall).toHaveAttribute("href", CHROME_WEB_STORE_URL);
    await expect(heroInstall).toHaveAttribute("target", "_blank");
    await expect(heroInstall).toHaveAttribute("rel", /noopener/);

    const heroStar = page.getByRole("link", { name: /Star on GitHub/i }).first();
    await expect(heroStar).toBeVisible();
    await expect(heroStar).toHaveAttribute("href", GITHUB_REPO_URL);

    // Landmark sections used by header hash links.
    await expect(page.locator("#features")).toBeVisible();
    await expect(page.locator("#faqs")).toBeVisible();
    await expect(page.locator("#install")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Get Guided Review" })).toBeVisible();

    // Primary nav (desktop viewport).
    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(primaryNav.getByRole("link", { name: "Features" })).toHaveAttribute(
      "href",
      "/#features",
    );
    await expect(primaryNav.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs");
    await expect(primaryNav.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/#faqs");

    // FAQ accordion: closed by default, opens on click.
    const firstFaq = page.locator("#faqs details").first();
    await expect
      .poll(async () => firstFaq.evaluate((el) => (el as HTMLDetailsElement).open))
      .toBe(false);
    await firstFaq.locator("summary").click();
    await expect
      .poll(async () => firstFaq.evaluate((el) => (el as HTMLDetailsElement).open))
      .toBe(true);
    await expect(firstFaq.locator("p").first()).toBeVisible();
  });

  test("header Docs link reaches the docs index", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Docs" })
      .click();
    await expect(page).toHaveURL(/\/docs\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
