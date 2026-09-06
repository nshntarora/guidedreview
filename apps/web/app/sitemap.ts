import type { MetadataRoute } from "next";
import { DOCS_PAGES } from "@web/config/docs";
import { SITE_URL } from "@web/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const docsIndex = DOCS_PAGES.find((page) => page.slug === "");
  if (!docsIndex) throw new Error("The docs index must be registered in DOCS_PAGES.");

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: "2026-09-06",
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
    url: `${SITE_URL}/docs/${page.slug}`,
    lastModified: page.lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...docEntries];
}
