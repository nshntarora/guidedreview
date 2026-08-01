import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCS_PAGES, findDocsPage } from "@/config/docs";
import { DocsPageWrapper } from "@/components/docs/DocsPageWrapper";
import { JsonLd } from "@/components/JsonLd";
import { openGraphSite, SITE_NAME, SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return DOCS_PAGES.filter((page) => page.load).map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = findDocsPage(slug);
  if (!page?.load) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/docs/${slug}` },
    openGraph: { ...openGraphSite, type: "article", url: `/docs/${slug}` },
  };
}

export default async function DocsSlugPage({ params }: Props) {
  const { slug } = await params;
  const page = findDocsPage(slug);
  if (!page?.load) notFound();

  const Content = (await page.load()).default;
  const pageUrl = `${SITE_URL}/docs/${slug}`;
  const org = { "@type": "Organization", name: SITE_NAME, url: SITE_URL };

  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.description,
    url: pageUrl,
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
    <DocsPageWrapper slug={slug}>
      <JsonLd data={techArticleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Content />
    </DocsPageWrapper>
  );
}
