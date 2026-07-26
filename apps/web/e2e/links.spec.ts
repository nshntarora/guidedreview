import { test, expect } from "@playwright/test";
import { collectFromPage, elementIdExists } from "./helpers/crawl";
import { allRoutes } from "./helpers/routes";
import { assertStatusOk, normalizePathname, resolveHref, resourceKey } from "./helpers/http";

test.describe("internal links and assets", () => {
  test("crawl all pages: internal URLs return <400; hash targets exist", async ({
    page,
    request,
    baseURL,
  }) => {
    expect(baseURL).toBeTruthy();
    const base = baseURL!;

    const checkedResources = new Set<string>();
    const checkedAnchors = new Set<string>(); // path#hash
    const failures: string[] = [];
    const blankTargetIssues: string[] = [];

    for (const route of allRoutes()) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const crawl = await collectFromPage(page);

      for (const asset of crawl.assets) {
        const resolved = resolveHref(asset, crawl.pageUrl, base);
        if (resolved.kind !== "internal") continue;
        const key = resourceKey(resolved.url);
        if (checkedResources.has(key)) continue;
        checkedResources.add(key);
        try {
          await assertStatusOk(request, resolved.url.toString(), `asset ${key}`);
        } catch (err) {
          failures.push(String(err));
        }
      }

      for (const anchor of crawl.anchors) {
        const href = anchor.href;
        if (!href.trim()) {
          failures.push(`Empty href on ${route}`);
          continue;
        }
        if (href.trim() === "#") {
          failures.push(`Bare "#" href on ${route}`);
          continue;
        }

        // Markup-only: external blank targets need noopener (no HTTP check).
        if (anchor.target === "_blank") {
          const rel = (anchor.rel ?? "").toLowerCase();
          if (!rel.includes("noopener")) {
            blankTargetIssues.push(`${route} → ${href} (target=_blank missing rel=noopener)`);
          }
        }

        const resolved = resolveHref(href, crawl.pageUrl, base);
        if (resolved.kind === "skip" || resolved.kind === "external") continue;

        const url = resolved.url;
        const pathKey = resourceKey(url);
        const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;

        if (!checkedResources.has(pathKey)) {
          checkedResources.add(pathKey);
          try {
            // Strip hash for the HTTP request
            const requestUrl = new URL(url.toString());
            requestUrl.hash = "";
            await assertStatusOk(request, requestUrl.toString(), `link ${pathKey}`);
          } catch (err) {
            failures.push(String(err));
          }
        }

        if (hash) {
          const destPath = normalizePathname(url.pathname);
          const anchorKey = `${destPath}#${hash}`;
          if (checkedAnchors.has(anchorKey)) continue;
          checkedAnchors.add(anchorKey);

          const currentPath = normalizePathname(new URL(crawl.pageUrl).pathname);
          if (destPath !== currentPath) {
            await page.goto(destPath, { waitUntil: "domcontentloaded" });
          }
          const exists = await elementIdExists(page, decodeURIComponent(hash));
          if (!exists) {
            failures.push(`Missing hash target ${anchorKey} (linked from ${route})`);
          }
          // Restore crawl page if we navigated away mid-loop for hash checks
          if (destPath !== currentPath) {
            await page.goto(route, { waitUntil: "domcontentloaded" });
          }
        }
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
    expect(blankTargetIssues, blankTargetIssues.join("\n")).toEqual([]);
  });
});
