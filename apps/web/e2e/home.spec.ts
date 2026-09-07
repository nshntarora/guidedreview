import { test, expect } from "@playwright/test";

test.describe("landing page", () => {
  test("hero, install, and primary CTAs", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("home-heading")).toBeVisible();
    await page.getByTestId("install-button-hero").click();
    await expect(page.getByTestId("install-section")).toBeInViewport();
    await expect(page.getByTestId("star-github-button-hero")).toBeVisible();

    const install = page.getByTestId("install-section");
    await expect(install.getByTestId("install-tab-cli")).toHaveAttribute("aria-selected", "true");
    await expect(install.getByTestId("install-panel-cli")).toBeVisible();
    await install.getByTestId("install-tab-chrome").click();
    await expect(page).toHaveURL(/#install-chrome$/);
    await expect(install.getByTestId("install-tab-chrome")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(install.getByTestId("install-panel-chrome")).toBeVisible();
    await expect(page.getByTestId("install-extension-button-install")).toHaveAttribute(
      "target",
      "_blank",
    );

    await expect(page.getByTestId("features-section")).toBeVisible();
    await expect(page.getByTestId("get-started-section")).toBeVisible();
    await expect(page.getByTestId("try-cli-button-install_cta")).toBeVisible();
    await expect(page.getByTestId("primary-nav")).toBeVisible();
  });

  test("primary navigation reaches the docs routes", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByTestId("primary-nav-docs").click();
    await expect(page).toHaveURL(/\/docs\/?$/);
    await expect(page.getByTestId("site-main")).toBeVisible();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByTestId("primary-nav-faq").click();
    await expect(page).toHaveURL(/\/docs\/faq\/?$/);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByTestId("primary-nav-chrome").click();
    await expect(page).toHaveURL(/\/docs\/chrome-extension\/?$/);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByTestId("primary-nav-cli").click();
    await expect(page).toHaveURL(/\/docs\/cli\/?$/);
  });

  test("install deep links select their matching tabs", async ({ page }) => {
    await page.goto("/#install-chrome", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("install-tab-chrome")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("install-panel-chrome")).toBeVisible();

    await page.goto("/#install-cli", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("install-tab-cli")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("install-panel-cli")).toBeVisible();
  });
});
