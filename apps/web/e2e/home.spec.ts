import { test, expect } from "@playwright/test";
import { CHROME_WEB_STORE_URL, CLI_INSTALL_COMMAND, GITHUB_REPO_URL } from "@web/lib/links";

test.describe("landing page", () => {
  test("hero, install, and primary CTAs", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Structure: a primary heading exists (copy may change).
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Hero primary CTA scrolls to the Install section.
    const hero = page.locator("main").locator("section").first();
    const heroInstall = hero.locator('a[href="/#install"]');
    await expect(heroInstall).toBeVisible();
    await heroInstall.click();
    await expect(page.locator("#install")).toBeInViewport();

    const heroStar = hero.locator(`a[href="${GITHUB_REPO_URL}"]`);
    await expect(heroStar).toBeVisible();

    // Install section: tabbed window with CLI + Chrome extension.
    const install = page.locator("#install");
    await expect(install.getByRole("heading", { level: 2 })).toBeVisible();

    const tabs = install.getByRole("tab");
    await expect(tabs).toHaveCount(2);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");

    const cliPanel = install.locator("#install-panel-cli");
    await expect(cliPanel).toBeVisible();
    await expect(cliPanel.getByRole("heading", { level: 3 })).toBeVisible();
    await expect(cliPanel.getByText(CLI_INSTALL_COMMAND)).toBeVisible();
    await expect(cliPanel.getByRole("img")).toBeVisible();

    await tabs.nth(1).click();
    await expect(page).toHaveURL(/#install-chrome$/);
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    const chromePanel = install.locator("#install-panel-chrome");
    await expect(chromePanel).toBeVisible();
    await expect(chromePanel.getByRole("heading", { level: 3 })).toBeVisible();

    const installChrome = chromePanel.locator(`a[href="${CHROME_WEB_STORE_URL}"]`);
    await expect(installChrome).toBeVisible();
    await expect(installChrome).toHaveAttribute("target", "_blank");
    await expect(installChrome).toHaveAttribute("rel", /noopener/);
    await expect(installChrome).toHaveAttribute("aria-keyshortcuts", /Meta\+E/);
    await expect(chromePanel.getByRole("img").first()).toBeVisible();

    // Landmark sections used by header hash links.
    await expect(page.locator("#features")).toBeVisible();
    const getStarted = page.locator("#get-started");
    await expect(getStarted).toBeVisible();
    await expect(getStarted.getByRole("heading", { level: 2 })).toBeVisible();

    const getStartedCli = getStarted.locator('a[href="/docs/cli"]');
    await expect(getStartedCli).toBeVisible();

    // Primary nav (desktop viewport). Install CTA jumps to the Install section.
    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    const headerInstall = primaryNav.locator('a[href="/#install"]');
    await expect(headerInstall).toHaveAttribute("aria-keyshortcuts", /Meta\+I/);
    await expect(heroInstall).toHaveAttribute("aria-keyshortcuts", /Meta\+I/);
    await expect(primaryNav.locator('a[href="/#features"]')).toBeVisible();
    await expect(primaryNav.locator('a[href="/docs"]')).toBeVisible();
    await expect(primaryNav.locator('a[href="/docs/faq"]')).toBeVisible();
    await expect(primaryNav.locator('a[href="/docs/cli"]')).toBeVisible();
    await expect(primaryNav.locator('a[href="/docs/chrome-extension"]')).toBeVisible();
  });

  test("header Docs link reaches the docs index", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("navigation", { name: "Primary" }).locator('a[href="/docs"]').click();
    await expect(page).toHaveURL(/\/docs\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("header FAQ link reaches the docs FAQ page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("navigation", { name: "Primary" }).locator('a[href="/docs/faq"]').click();
    await expect(page).toHaveURL(/\/docs\/faq\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("header CLI and Chrome extension links reach their docs pages", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const primaryNav = page.getByRole("navigation", { name: "Primary" });

    await primaryNav.locator('a[href="/docs/chrome-extension"]').click();
    await expect(page).toHaveURL(/\/docs\/chrome-extension\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await primaryNav.locator('a[href="/docs/cli"]').click();
    await expect(page).toHaveURL(/\/docs\/cli\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("install tab deep links select the matching tab", async ({ page }) => {
    await page.goto("/#install-chrome", { waitUntil: "domcontentloaded" });
    const install = page.locator("#install");
    await expect(install.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(install.locator("#install-panel-chrome")).toBeVisible();

    await page.goto("/#install-cli", { waitUntil: "domcontentloaded" });
    await expect(install.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
    await expect(install.locator("#install-panel-cli")).toBeVisible();
  });
});
