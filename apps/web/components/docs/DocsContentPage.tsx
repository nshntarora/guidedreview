import type { Metadata } from "next";
import { docsPath, type DocsPage } from "@web/config/docs";
import { DocsPageWrapper } from "@web/components/docs/DocsPageWrapper";
import { JsonLd } from "@web/components/JsonLd";
import { openGraphSite, SITE_NAME, SITE_URL } from "@web/lib/site";

export function docsPageMetadata(page: DocsPage): Metadata {
  return {
    title: page.seoTitle ? { absolute: page.seoTitle } : page.title,
    description: page.description,
    alternates: { canonical: docsPath(page.slug) },
    openGraph: {
      ...openGraphSite,
      type: "article",
      url: docsPath(page.slug),
      modifiedTime: page.lastModified,
    },
  };
}

export async function DocsContentPage({ page }: { page: DocsPage }) {
  if (!page.load) throw new Error(`No content loader for ${page.slug}`);
  const Content = (await page.load()).default;
  const pageUrl = `${SITE_URL}${docsPath(page.slug)}`;
  const org = { "@type": "Organization", name: SITE_NAME, url: SITE_URL };

  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.description,
    url: pageUrl,
    dateModified: page.lastModified,
    author: org,
    publisher: org,
    isPartOf: { "@type": "WebSite", url: SITE_URL, name: SITE_NAME },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Docs", item: `${SITE_URL}/docs` },
      { "@type": "ListItem", position: 2, name: page.title, item: pageUrl },
    ],
  };

  return (
    <DocsPageWrapper slug={page.slug}>
      <JsonLd data={techArticleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Content />
    </DocsPageWrapper>
  );
}
