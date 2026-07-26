import { test, expect } from "@playwright/test";
import { collectFromPage } from "./helpers/crawl";
import { allRoutes, PUBLIC_ASSETS } from "./helpers/routes";
import { assertStatusOk } from "./helpers/http";

test.describe("smoke: all routes respond", () => {
  for (const route of allRoutes()) {
    test(`${route} returns 200 and has basic structure`, async ({ page, request }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response, `navigation to ${route}`).not.toBeNull();
      expect(response!.status(), `${route} status`).toBeLessThan(400);

      const crawl = await collectFromPage(page);
      expect(crawl.lang, `${route} html lang`).toBe("en");
      expect(crawl.hasMain, `${route} #main`).toBe(true);
      expect(crawl.h1Count, `${route} h1 count`).toBeGreaterThanOrEqual(1);
      expect(crawl.title, `${route} title`).toMatch(/Guided Review/i);
      expect(crawl.skipLinkHref, `${route} skip link`).toBe("#main");

      // Also verify via request API (no client redirect quirks)
      await assertStatusOk(request, route, `GET ${route}`);
    });
  }
});

test.describe("smoke: public assets", () => {
  for (const asset of PUBLIC_ASSETS) {
    test(`${asset} is available`, async ({ request }) => {
      await assertStatusOk(request, asset, `GET ${asset}`);
    });
  }
});

test("unknown path is not a soft-200 of the homepage", async ({ request }) => {
  const path = "/this-page-does-not-exist-e2e-test";
  const response = await request.get(path);
  const status = response.status();
  // serve returns 404; Cloudflare may serve 404.html with 404 status.
  // Never accept a successful HTML document that looks like the homepage.
  if (status < 400) {
    const body = await response.text();
    expect(body, "404 soft-200 must not be homepage").not.toMatch(
      /A better way for humans to review AI generated code/i,
    );
    // Prefer failing if the server pretends the page exists with 200
    expect(status, `unexpected success for ${path}`).toBeGreaterThanOrEqual(400);
  } else {
    expect(status).toBeGreaterThanOrEqual(400);
  }
});
