import { test, expect } from "@playwright/test";
import { DOCS_PAGES } from "../config/docs";
import { docsPath } from "./helpers/routes";
import { assertStatusOk } from "./helpers/http";

test.describe("docs registry", () => {
  test("every page in the docs config is reachable", async ({ request }) => {
    for (const page of DOCS_PAGES) {
      const path = docsPath(page.slug);
      await assertStatusOk(request, path, `docs ${page.title} (${path})`);
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
});
