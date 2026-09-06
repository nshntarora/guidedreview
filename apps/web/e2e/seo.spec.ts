import { test, expect } from "@playwright/test";
import { collectFromPage } from "./helpers/crawl";
import { fetchOk, isPng, pngSize, resolveHref } from "./helpers/http";
import { allRoutes, PRODUCTION_ORIGIN } from "./helpers/routes";

async function metaOn(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return collectFromPage(page);
}

test.describe("SEO and Open Graph", () => {
  test("home has title, description, OG, and Twitter tags", async ({ page }) => {
    const crawl = await metaOn(page, "/");
    expect(crawl.title.length).toBeGreaterThan(10);
    expect(crawl.title.length).toBeLessThanOrEqual(60);
    expect(crawl.title).toMatch(/Guided Review/i);

    const desc = crawl.meta["description"];
    expect(desc, "meta description").toBeTruthy();
    expect(desc!.length).toBeGreaterThanOrEqual(120);
    expect(desc!.length).toBeLessThanOrEqual(160);

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
    expect(crawl.meta["twitter:creator"]).toBe("@nshntarora");
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

  test("all public pages have complete search and social metadata", async ({ page, baseURL }) => {
    for (const path of allRoutes()) {
      const crawl = await metaOn(page, path);
      expect(crawl.title, `${path} title`).toMatch(/Guided Review/i);
      expect(crawl.title.length, `${path} title length`).toBeLessThanOrEqual(60);

      const description = crawl.meta["description"] ?? "";
      expect(description.length, `${path} description minimum`).toBeGreaterThanOrEqual(120);
      expect(description.length, `${path} description maximum`).toBeLessThanOrEqual(160);

      expect(crawl.meta["og:title"], `${path} og:title`).toBeTruthy();
      expect(crawl.meta["og:description"], `${path} og:description`).toBeTruthy();
      expect(crawl.meta["og:image"], `${path} og:image`).toMatch(/opengraph-image/);
      expect(crawl.meta["og:image:width"], `${path} og:image:width`).toBe("1200");
      expect(crawl.meta["og:image:height"], `${path} og:image:height`).toBe("630");
      expect(crawl.meta["og:image:alt"], `${path} og:image:alt`).toBeTruthy();
      expect(crawl.meta["twitter:card"], `${path} twitter:card`).toBe("summary_large_image");
      expect(crawl.meta["twitter:image"], `${path} twitter:image`).toMatch(/opengraph-image/);

      const canonical = crawl.meta["link:canonical"];
      expect(canonical, `${path} canonical`).toBeTruthy();
      const resolved = resolveHref(canonical!, crawl.pageUrl, baseURL!);
      expect(resolved.kind, `${path} canonical internal`).toBe("internal");
      if (resolved.kind === "internal") {
        expect(resolved.url.pathname.replace(/\/$/, "") || "/").toBe(path);
      }
    }
  });

  test("docs slug has TechArticle and BreadcrumbList JSON-LD", async ({ page }) => {
    const crawl = await metaOn(page, "/docs/chrome-extension");
    const parsed = crawl.jsonLd.map((raw) => JSON.parse(raw) as Record<string, unknown>);
    const types = parsed.map((doc) => doc["@type"]);
    expect(types).toContain("TechArticle");
    expect(types).toContain("BreadcrumbList");

    const article = parsed.find((doc) => doc["@type"] === "TechArticle");
    expect(article?.["dateModified"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const crumbs = parsed.find((doc) => doc["@type"] === "BreadcrumbList");
    const items = crumbs!["itemListElement"] as Array<{ name?: string }>;
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.some((i) => /docs/i.test(i.name ?? ""))).toBe(true);
  });

  test("legal pages expose WebPage JSON-LD with modification dates", async ({ page }) => {
    for (const path of ["/privacy", "/terms", "/cookies"]) {
      const crawl = await metaOn(page, path);
      const parsed = crawl.jsonLd.map((raw) => JSON.parse(raw) as Record<string, unknown>);
      const webPage = parsed.find((doc) => doc["@type"] === "WebPage");
      expect(webPage, `${path} WebPage`).toBeTruthy();
      expect(webPage?.["dateModified"], `${path} dateModified`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
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
    expect(body).toContain(`Sitemap: ${PRODUCTION_ORIGIN}/sitemap.xml`);
  });

  test("sitemap.xml lists home, docs, and legal routes", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBeLessThan(400);
    const body = await response.text();
    expect(body).toMatch(/<urlset[\s>]/);
    for (const path of allRoutes()) {
      expect(body, `sitemap entry for ${path}`).toContain(
        `${PRODUCTION_ORIGIN}${path === "/" ? "" : path}`,
      );
    }
    expect(body.match(/<lastmod>\d{4}-\d{2}-\d{2}(?:T[^<]+)?<\/lastmod>/g)).toHaveLength(
      allRoutes().length,
    );
  });
});
