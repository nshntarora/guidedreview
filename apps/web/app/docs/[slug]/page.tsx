import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { helpPages } from "@/config/help-pages";
import { helpNavigation } from "@/config/help-navigation";
import { DocsPageWrapper } from "@/components/docs/DocsPageWrapper";
import { JsonLd } from "@/components/JsonLd";
import { openGraphSite, SITE_NAME, SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

function getNavPage(slug: string) {
  return helpNavigation.find((item) => item.type !== "heading" && item.slug === slug);
}

function getPageTitle(slug: string): string {
  const navItem = getNavPage(slug);
  return navItem && navItem.type !== "heading" ? navItem.title : slug;
}

function getPageDescription(slug: string, pageTitle: string): string {
  const navItem = getNavPage(slug);
  if (navItem && navItem.type !== "heading" && navItem.description) {
    return navItem.description;
  }
  return `${SITE_NAME} documentation: ${pageTitle}.`;
}

export async function generateStaticParams() {
  return Object.keys(helpPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!helpPages[slug]) return {};

  const pageTitle = getPageTitle(slug);
  const description = getPageDescription(slug, pageTitle);

  return {
    title: pageTitle,
    description,
    alternates: { canonical: `/docs/${slug}` },
    openGraph: { ...openGraphSite, type: "article", url: `/docs/${slug}` },
  };
}

export default async function DocsSlugPage({ params }: Props) {
  const { slug } = await params;
  const loader = helpPages[slug];
  if (!loader) notFound();

  const mod = await loader();
  const Content = mod.default;
  const pageTitle = getPageTitle(slug);
  const description = getPageDescription(slug, pageTitle);
  const pageUrl = `${SITE_URL}/docs/${slug}`;

  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: pageTitle,
    description,
    url: pageUrl,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    isPartOf: { "@type": "WebSite", url: SITE_URL, name: SITE_NAME },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Docs",
        item: `${SITE_URL}/docs`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageTitle,
        item: pageUrl,
      },
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
