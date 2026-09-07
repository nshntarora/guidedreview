import { test, expect } from "@playwright/test";
import { DOCS_PAGES } from "@web/config/docs";
import { docsPath } from "./helpers/routes";
import { assertStatusOk } from "./helpers/http";

test.describe("docs registry", () => {
  test("every page in the docs config is reachable", async ({ request }) => {
    for (const page of DOCS_PAGES) {
      const path = docsPath(page.slug);
      await assertStatusOk(request, path, `docs ${page.slug || "index"} (${path})`);
    }
  });

  test("docs index and a slug page link to other docs pages", async ({ page }) => {
    await page.goto("/docs", { waitUntil: "domcontentloaded" });
    const indexCount = await page.locator('a[href^="/docs"]').count();
    expect(indexCount, "docs index should link to other docs").toBeGreaterThan(3);

    await page.goto("/docs/chrome-extension", { waitUntil: "domcontentloaded" });
    const installCount = await page.locator('a[href^="/docs"]').count();
    expect(installCount, "docs slug page should link to other docs").toBeGreaterThan(3);
  });

  test("docs sidebar and pager navigate between pages", async ({ page }) => {
    // Desktop Chrome viewport shows the sidebar (lg:block).
    await page.goto("/docs", { waitUntil: "domcontentloaded" });

    const sidebar = page.getByRole("navigation", { name: "Documentation" });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('a[href="/docs"]')).toHaveAttribute("aria-current", "page");

    const chromeIndex = DOCS_PAGES.findIndex((p) => p.slug === "chrome-extension");
    expect(chromeIndex, "chrome-extension page in docs registry").toBeGreaterThan(0);
    const prevPage = DOCS_PAGES[chromeIndex - 1]!;
    const nextPage = DOCS_PAGES[chromeIndex + 1]!;
    const chromeHref = docsPath("chrome-extension");
    const prevHref = docsPath(prevPage.slug);
    const nextHref = docsPath(nextPage.slug);

    await sidebar.locator(`a[href="${chromeHref}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${chromeHref}/?$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(sidebar.locator(`a[href="${chromeHref}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Apps section heading appears above the Chrome Extension page.
    await expect(sidebar.getByText("Apps", { exact: true })).toBeVisible();
    await expect(sidebar.locator('a[href="/docs/cli"]')).toBeVisible();

    // Pager follows DOCS_PAGES order — not hardcoded titles.
    await page.getByRole("link", { name: /Previous/i }).click();
    await expect(page).toHaveURL(new RegExp(`${prevHref}/?$`));

    await page.goto(chromeHref, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Next/i }).click();
    await expect(page).toHaveURL(new RegExp(`${nextHref}/?$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
