import { test, expect } from "@playwright/test";
import { docsPath, helpPageSlugs, navPages } from "./helpers/routes";
import { assertStatusOk } from "./helpers/http";

test.describe("docs registry", () => {
  test("helpPages and helpNavigation stay in sync", () => {
    const nav = navPages();
    const navSlugs = new Set(nav.map((p) => p.slug));
    const pageSlugs = new Set(helpPageSlugs());

    // Intro is slug "" in nav; not a helpPages key
    const navContentSlugs = new Set([...navSlugs].filter((s) => s !== ""));

    const missingFromPages = [...navContentSlugs].filter((s) => !pageSlugs.has(s));
    const missingFromNav = [...pageSlugs].filter((s) => !navContentSlugs.has(s));

    expect(
      missingFromPages,
      `nav entries without helpPages: ${missingFromPages.join(", ")}`,
    ).toEqual([]);
    expect(missingFromNav, `helpPages missing from nav: ${missingFromNav.join(", ")}`).toEqual([]);

    // Intro must exist in nav
    expect(navSlugs.has("")).toBe(true);
  });

  test("every docs nav entry is reachable", async ({ request }) => {
    for (const page of navPages()) {
      const path = docsPath(page.slug);
      await assertStatusOk(request, path, `docs ${page.title} (${path})`);
    }
  });

  test("every helpPages slug is reachable", async ({ request }) => {
    for (const slug of helpPageSlugs()) {
      await assertStatusOk(request, docsPath(slug), `helpPages ${slug}`);
    }
  });

  test("docs index and a slug page link to other docs pages", async ({ page }) => {
    await page.goto("/docs", { waitUntil: "domcontentloaded" });
    const indexCount = await page.locator('a[href^="/docs"]').count();
    expect(indexCount, "docs index should link to other docs").toBeGreaterThan(3);

    await page.goto("/docs/install", { waitUntil: "domcontentloaded" });
    const installCount = await page.locator('a[href^="/docs"]').count();
    expect(installCount, "docs slug page should link to other docs").toBeGreaterThan(3);
  });

  test("docs sidebar and pager navigate between pages", async ({ page }) => {
    // Desktop Chrome viewport shows the sticky sidebar (lg:block).
    await page.goto("/docs", { waitUntil: "domcontentloaded" });

    const sidebar = page.getByRole("navigation", { name: "Documentation" });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Introduction" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await sidebar.getByRole("link", { name: "Install the extension" }).click();
    await expect(page).toHaveURL(/\/docs\/install\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: /Install/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Install the extension" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Pager: Previous back to intro, Next forward to first-review.
    await page.getByRole("link", { name: /Previous/i }).click();
    await expect(page).toHaveURL(/\/docs\/?$/);

    await page.goto("/docs/install", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Next/i }).click();
    await expect(page).toHaveURL(/\/docs\/first-review\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
