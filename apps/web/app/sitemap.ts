import type { MetadataRoute } from "next";
import { DOCS_PAGES, docsPath } from "@web/config/docs";
import { GUIDES } from "@web/config/guides";
import { COMPARISONS } from "@web/config/compare";
import { SITE_URL } from "@web/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const docsIndex = DOCS_PAGES.find((page) => page.slug === "");
  if (!docsIndex) throw new Error("The docs index must be registered in DOCS_PAGES.");

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: "2026-10-08",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/docs`,
      lastModified: docsIndex.lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: "2026-09-06",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: "2026-09-06",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/cookies`,
      lastModified: "2026-09-06",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const docEntries: MetadataRoute.Sitemap = DOCS_PAGES.filter((page) => page.load).map((page) => ({
    url: `${SITE_URL}${docsPath(page.slug)}`,
    lastModified: page.lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const articleEntries: MetadataRoute.Sitemap = [...GUIDES, ...COMPARISONS].map((article) => ({
    url: `${SITE_URL}${article.path}`,
    lastModified: article.lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const collections: MetadataRoute.Sitemap = ["/guides", "/compare"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: "2026-10-08",
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  return [...staticEntries, ...docEntries, ...collections, ...articleEntries];
}
