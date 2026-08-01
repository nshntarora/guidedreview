import { test, expect } from "@playwright/test";
import { collectFromPage } from "./helpers/crawl";
import { fetchOk, isPng, pngSize, resolveHref } from "./helpers/http";

async function metaOn(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return collectFromPage(page);
}

test.describe("SEO and Open Graph", () => {
  test("home has title, description, OG, and Twitter tags", async ({ page }) => {
    const crawl = await metaOn(page, "/");
    expect(crawl.title.length).toBeGreaterThan(10);
    expect(crawl.title).toMatch(/Guided Review/i);

    const desc = crawl.meta["description"];
    expect(desc, "meta description").toBeTruthy();
    expect(desc!.length).toBeGreaterThanOrEqual(50);
    expect(desc!.length).toBeLessThanOrEqual(320);

    expect(crawl.meta["og:title"]).toBeTruthy();
    expect(crawl.meta["og:description"]).toBeTruthy();
    expect(crawl.meta["og:type"]).toBe("website");
    expect(crawl.meta["og:image"]).toMatch(/opengraph-image/);
    expect(crawl.meta["og:image:width"]).toBe("1200");
    expect(crawl.meta["og:image:height"]).toBe("630");
    expect(crawl.meta["og:image:type"]).toBe("image/png");
    expect(crawl.meta["og:image:alt"]?.length ?? 0).toBeGreaterThan(0);

    expect(crawl.meta["twitter:card"]).toBe("summary_large_image");
    expect(crawl.meta["twitter:title"]).toBeTruthy();
    expect(crawl.meta["twitter:description"]).toBeTruthy();
    expect(crawl.meta["twitter:image"]).toMatch(/opengraph-image/);
  });

  test("opengraph-image is a 1200×630 PNG (meta URL + bare path)", async ({
    page,
    request,
    baseURL,
  }) => {
    const crawl = await metaOn(page, "/");
    const ogImage = crawl.meta["og:image"];
    expect(ogImage).toBeTruthy();

    const resolved = resolveHref(ogImage!, crawl.pageUrl, baseURL!);
    expect(resolved.kind).toBe("internal");
    if (resolved.kind !== "internal") return;

    const fromMeta = await fetchOk(request, resolved.url.toString());
    expect(fromMeta.status, "og:image URL status").toBeLessThan(400);
    expect(isPng(fromMeta.body), "og:image is PNG").toBe(true);
    expect(pngSize(fromMeta.body)).toEqual({ width: 1200, height: 630 });

    const bare = await fetchOk(request, "/opengraph-image");
    expect(bare.status).toBeLessThan(400);
    expect(isPng(bare.body)).toBe(true);
    expect(pngSize(bare.body)).toEqual({ width: 1200, height: 630 });
  });

  test("docs and legal pages have description and canonical", async ({ page, baseURL }) => {
    const samples = [
      { path: "/docs", expectedCanonical: "/docs" },
      { path: "/docs/install", expectedCanonical: "/docs/install" },
      { path: "/privacy", expectedCanonical: "/privacy" },
      { path: "/terms", expectedCanonical: "/terms" },
      { path: "/cookies", expectedCanonical: "/cookies" },
    ];

    for (const { path, expectedCanonical } of samples) {
      const crawl = await metaOn(page, path);
      expect(crawl.title, `${path} title`).toMatch(/Guided Review/i);
      expect(crawl.meta["description"], `${path} description`).toBeTruthy();

      const canonical = crawl.meta["link:canonical"];
      expect(canonical, `${path} canonical`).toBeTruthy();
      const resolved = resolveHref(canonical!, crawl.pageUrl, baseURL!);
      expect(resolved.kind, `${path} canonical internal`).toBe("internal");
      if (resolved.kind === "internal") {
        expect(resolved.url.pathname.replace(/\/$/, "") || "/").toBe(expectedCanonical);
      }
    }
  });

  test("home FAQPage JSON-LD is valid", async ({ page }) => {
    const crawl = await metaOn(page, "/");
    expect(crawl.jsonLd.length).toBeGreaterThan(0);

    const parsed = crawl.jsonLd.map((raw) => JSON.parse(raw) as Record<string, unknown>);
    const faq = parsed.find((doc) => doc["@type"] === "FAQPage");
    expect(faq, "FAQPage schema").toBeTruthy();
    const entities = faq!["mainEntity"];
    expect(Array.isArray(entities)).toBe(true);
    expect((entities as unknown[]).length).toBeGreaterThan(0);
  });

  test("docs slug has TechArticle and BreadcrumbList JSON-LD", async ({ page }) => {
    const crawl = await metaOn(page, "/docs/install");
    const parsed = crawl.jsonLd.map((raw) => JSON.parse(raw) as Record<string, unknown>);
    const types = parsed.map((doc) => doc["@type"]);
    expect(types).toContain("TechArticle");
    expect(types).toContain("BreadcrumbList");

    const crumbs = parsed.find((doc) => doc["@type"] === "BreadcrumbList");
    const items = crumbs!["itemListElement"] as Array<{ name?: string }>;
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.some((i) => /docs/i.test(i.name ?? ""))).toBe(true);
  });

  test("favicon is reachable", async ({ page, request, baseURL }) => {
    const crawl = await metaOn(page, "/");
    // Prefer icon link from head; fall back to /favicon.ico
    const iconHref =
      crawl.assets.find((a) => a.includes("favicon") || a.endsWith(".ico")) ?? "/favicon.ico";
    const resolved = resolveHref(iconHref, crawl.pageUrl, baseURL!);
    expect(resolved.kind).toBe("internal");
    if (resolved.kind === "internal") {
      const res = await fetchOk(request, resolved.url.toString());
      expect(res.status).toBeLessThan(400);
      expect(res.body.length).toBeGreaterThan(0);
    }
  });

  test("robots.txt allows crawl and points at the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBeLessThan(400);
    const body = await response.text();
    expect(body).toMatch(/User-agent:\s*\*/i);
    expect(body).toMatch(/Allow:\s*\//i);
    expect(body).toMatch(/Sitemap:\s*https:\/\/guidedreview\.dev\/sitemap\.xml/i);
  });

  test("sitemap.xml lists home, docs, and legal routes", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBeLessThan(400);
    const body = await response.text();
    expect(body).toMatch(/<urlset[\s>]/);
    for (const path of ["", "/docs", "/docs/install", "/privacy", "/terms", "/cookies"]) {
      expect(body, `sitemap entry for ${path || "/"}`).toContain(`https://guidedreview.dev${path}`);
    }
  });
});
