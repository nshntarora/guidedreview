import { test, expect } from "@playwright/test";
import { CHROME_WEB_STORE_URL, GITHUB_REPO_URL } from "@web/lib/links";

test.describe("landing page", () => {
  test("hero, surfaces, primary CTAs, and FAQ accordion", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: /review AI generated code/i }),
    ).toBeVisible();

    // Hero primary CTA scrolls to the dual-surface section.
    const heroSurfaces = page.getByRole("link", { name: /See Chrome & CLI/i }).first();
    await expect(heroSurfaces).toBeVisible();
    await expect(heroSurfaces).toHaveAttribute("href", "#surfaces");
    await heroSurfaces.click();
    await expect(page.locator("#surfaces")).toBeInViewport();

    const heroStar = page.getByRole("link", { name: /Star on GitHub/i }).first();
    await expect(heroStar).toBeVisible();
    await expect(heroStar).toHaveAttribute("href", GITHUB_REPO_URL);

    // Surfaces section: Chrome install + CLI docs.
    await expect(page.getByRole("heading", { name: "Where you run it" })).toBeVisible();

    const surfacesInstall = page
      .locator("#surfaces")
      .getByRole("link", { name: /Install the extension/i });
    await expect(surfacesInstall).toBeVisible();
    await expect(surfacesInstall).toHaveAttribute("href", CHROME_WEB_STORE_URL);
    await expect(surfacesInstall).toHaveAttribute("target", "_blank");
    await expect(surfacesInstall).toHaveAttribute("rel", /noopener/);

    const surfacesCli = page.locator("#surfaces").getByRole("link", { name: /Try the CLI/i });
    await expect(surfacesCli).toBeVisible();
    await expect(surfacesCli).toHaveAttribute("href", "/docs/local-review");

    // Landmark sections used by header hash links.
    await expect(page.locator("#features")).toBeVisible();
    await expect(page.locator("#faqs")).toBeVisible();
    await expect(page.locator("#install")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Get Guided Review" })).toBeVisible();

    const installCli = page.locator("#install").getByRole("link", { name: /Try the CLI/i });
    await expect(installCli).toBeVisible();
    await expect(installCli).toHaveAttribute("href", "/docs/local-review");

    // Primary nav (desktop viewport).
    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(primaryNav.getByRole("link", { name: "Chrome & CLI" })).toHaveAttribute(
      "href",
      "/#surfaces",
    );
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
