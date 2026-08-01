import type { Page } from "@playwright/test";

type CollectedAnchor = {
  href: string;
  target: string | null;
  rel: string | null;
};

type PageCrawl = {
  pageUrl: string;
  anchors: CollectedAnchor[];
  assets: string[];
  meta: Record<string, string>;
  jsonLd: string[];
  title: string;
  lang: string | null;
  hasMain: boolean;
  h1Count: number;
  skipLinkHref: string | null;
};

/**
 * Collect links, same-document assets, and SEO bits from a loaded page.
 * Attribute values only — no network.
 */
export async function collectFromPage(page: Page): Promise<PageCrawl> {
  return page.evaluate(() => {
    const anchors = [...document.querySelectorAll("a[href]")].map((el) => {
      const a = el as HTMLAnchorElement;
      return {
        href: a.getAttribute("href") ?? "",
        target: a.getAttribute("target"),
        rel: a.getAttribute("rel"),
      };
    });

    const assets = new Set<string>();
    for (const el of document.querySelectorAll(
      "img[src], script[src], video[src], source[src], audio[src]",
    )) {
      const value = el.getAttribute("src");
      if (value) assets.add(value);
    }
    for (const el of document.querySelectorAll("video[poster]")) {
      const value = el.getAttribute("poster");
      if (value) assets.add(value);
    }
    for (const el of document.querySelectorAll("link[href]")) {
      const rel = (el.getAttribute("rel") ?? "").toLowerCase();
      if (
        rel.includes("icon") ||
        rel === "stylesheet" ||
        rel === "preload" ||
        rel === "modulepreload"
      ) {
        const href = el.getAttribute("href");
        if (href) assets.add(href);
      }
    }

    const meta: Record<string, string> = {};
    for (const el of document.querySelectorAll("meta[name], meta[property]")) {
      const key = el.getAttribute("property") ?? el.getAttribute("name");
      const content = el.getAttribute("content");
      if (key && content != null) meta[key] = content;
    }
    const canonical = document.querySelector("link[rel='canonical']")?.getAttribute("href");
    if (canonical) meta["link:canonical"] = canonical;

    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
      (el) => el.textContent ?? "",
    );

    const skip = document.querySelector('a[href="#main"]');

    return {
      pageUrl: location.href,
      anchors,
      assets: [...assets],
      meta,
      jsonLd,
      title: document.title,
      lang: document.documentElement.getAttribute("lang"),
      hasMain: !!document.getElementById("main"),
      h1Count: document.querySelectorAll("h1").length,
      skipLinkHref: skip?.getAttribute("href") ?? null,
    };
  });
}

/** Whether an element with the given id exists in the current document. */
export async function elementIdExists(page: Page, id: string): Promise<boolean> {
  if (!id) return false;
  return page.evaluate((elementId) => {
    if (document.getElementById(elementId)) return true;
    // CSS.escape for ids that need it; fallback query
    try {
      return !!document.querySelector(`#${CSS.escape(elementId)}`);
    } catch {
      return false;
    }
  }, id);
}
