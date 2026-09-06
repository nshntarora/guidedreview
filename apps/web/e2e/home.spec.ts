import { test, expect } from "@playwright/test";
import { CHROME_WEB_STORE_URL, CLI_INSTALL_COMMAND, GITHUB_REPO_URL } from "@web/lib/links";

test.describe("landing page", () => {
  test("hero, install, primary CTAs, and FAQ accordion", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: /review AI generated code/i }),
    ).toBeVisible();

    // Hero primary CTA scrolls to the Install section.
    const hero = page.locator("main").locator("section").first();
    const heroInstall = hero.getByRole("link", { name: /^Install$/i });
    await expect(heroInstall).toBeVisible();
    await expect(heroInstall).toHaveAttribute("href", "#install");
    await heroInstall.click();
    await expect(page.locator("#install")).toBeInViewport();

    const heroStar = hero.getByRole("link", { name: /Star on GitHub/i });
    await expect(heroStar).toBeVisible();
    await expect(heroStar).toHaveAttribute("href", GITHUB_REPO_URL);

    // Install section: tabbed window with CLI + Chrome extension.
    const install = page.locator("#install");
    await expect(page.getByRole("heading", { name: "Install", exact: true })).toBeVisible();
    await expect(install.getByRole("tab", { name: /^CLI$/i })).toBeVisible();
    await expect(install.getByRole("tab", { name: /chrome extension/i })).toBeVisible();

    await expect(install.getByRole("heading", { name: /from the command line/i })).toBeVisible();
    await expect(install.getByText(CLI_INSTALL_COMMAND)).toBeVisible();
    await expect(install.getByText(/server will start up/i)).toBeVisible();
    await expect(install.getByRole("img", { name: /Guided Review CLI review UI/i })).toBeVisible();

    await install.getByRole("tab", { name: /chrome extension/i }).click();
    await expect(install.getByRole("heading", { name: /^Chrome extension$/i })).toBeVisible();
    const installChrome = install.getByRole("link", { name: /Install the extension/i });
    await expect(installChrome).toBeVisible();
    await expect(installChrome).toHaveAttribute("href", CHROME_WEB_STORE_URL);
    await expect(installChrome).toHaveAttribute("target", "_blank");
    await expect(installChrome).toHaveAttribute("rel", /noopener/);
    await expect(
      install.getByRole("img", { name: /Guided Review Chrome extension/i }),
    ).toBeVisible();

    // Landmark sections used by header hash links.
    await expect(page.locator("#features")).toBeVisible();
    await expect(page.locator("#faqs")).toBeVisible();
    await expect(page.locator("#get-started")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Get Guided Review" })).toBeVisible();

    const getStartedCli = page.locator("#get-started").getByRole("link", { name: /Try the CLI/i });
    await expect(getStartedCli).toBeVisible();
    await expect(getStartedCli).toHaveAttribute("href", "/docs/local-review");

    // Primary nav (desktop viewport). Hash links — not the Chrome install CTA.
    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(primaryNav.locator('a[href="/#install"]')).toBeVisible();
    await expect(primaryNav.locator('a[href="/#features"]')).toBeVisible();
    await expect(primaryNav.getByRole("link", { name: "Docs", exact: true })).toHaveAttribute(
      "href",
      "/docs",
    );
    await expect(primaryNav.locator('a[href="/#faqs"]')).toBeVisible();

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
