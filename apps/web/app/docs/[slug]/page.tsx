import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { helpPages, type TocEntry } from "@/config/help-pages";
import { helpNavigation } from "@/config/help-navigation";
import { DocsPageWrapper } from "@/components/docs/DocsPageWrapper";

type Props = { params: Promise<{ slug: string }> };

const SITE_URL = "https://guidedreview.com";

function getPageTitle(slug: string): string {
  const navItem = helpNavigation.find((item) => item.type !== "heading" && item.slug === slug);
  return navItem && navItem.type !== "heading" ? navItem.title : slug;
}

export async function generateStaticParams() {
  return Object.keys(helpPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!helpPages[slug]) return {};

  const pageTitle = getPageTitle(slug);

  return {
    title: pageTitle,
    description: `Guided Review documentation: ${pageTitle}. Learn how to use this feature.`,
    alternates: { canonical: `/docs/${slug}` },
    openGraph: { type: "article", url: `/docs/${slug}` },
  };
}

export default async function DocsSlugPage({ params }: Props) {
  const { slug } = await params;
  const loader = helpPages[slug];
  if (!loader) notFound();

  const mod = await loader();
  const Content = mod.default;
  const toc: TocEntry[] = mod.toc ?? [];
  const pageTitle = getPageTitle(slug);

  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: pageTitle,
    description: `Guided Review documentation: ${pageTitle}.`,
    url: `${SITE_URL}/docs/${slug}`,
    isPartOf: { "@type": "WebSite", url: SITE_URL, name: "Guided Review" },
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
        item: `${SITE_URL}/docs/${slug}`,
      },
    ],
  };

  return (
    <DocsPageWrapper slug={slug} toc={toc}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Content />
    </DocsPageWrapper>
  );
}
