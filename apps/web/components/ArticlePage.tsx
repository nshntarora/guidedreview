import type { Metadata } from "next";
import Link from "next/link";
import { formatArticleMonthYear, type Article } from "@web/config/articles";
import { JsonLd } from "@web/components/JsonLd";
import { openGraphSite, SITE_NAME, SITE_URL } from "@web/lib/site";

export function articleMetadata(article: Article): Metadata {
  return {
    title: article.seoTitle ? { absolute: article.seoTitle } : article.title,
    description: article.description,
    alternates: { canonical: article.path },
    openGraph: {
      ...openGraphSite,
      type: "article",
      url: article.path,
      modifiedTime: article.lastModified,
    },
  };
}

export async function ArticlePage({
  article,
  section,
  sectionPath,
}: {
  article: Article;
  section: string;
  sectionPath: string;
}) {
  const Content = (await article.load()).default;
  const organization = { "@type": "Organization", name: SITE_NAME, url: SITE_URL };
  const displayLastModified =
    sectionPath === "/guides" ? formatArticleMonthYear(article.lastModified) : article.lastModified;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm">
        <Link href={sectionPath}>← All {section.toLowerCase()}</Link>
      </nav>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span className="uppercase tracking-widest">{section} / Guided Review</span>
        <span>
          Updated <time dateTime={article.lastModified}>{displayLastModified}</time>
        </span>
      </div>
      <article className="article-content" data-testid="article-content">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": sectionPath === "/guides" ? "BlogPosting" : "Article",
            headline: article.title,
            description: article.description,
            url: `${SITE_URL}${article.path}`,
            dateModified: article.lastModified,
            author: organization,
            publisher: organization,
            isPartOf: {
              "@type": "CollectionPage",
              name: section,
              url: `${SITE_URL}${sectionPath}`,
            },
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: section,
                item: `${SITE_URL}${sectionPath}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: article.title,
                item: `${SITE_URL}${article.path}`,
              },
            ],
          }}
        />
        <Content />
      </article>
      <nav aria-label="More reading" className="mt-12 border-t border-border pt-6 text-sm">
        <Link href={sectionPath}>← Back to {section.toLowerCase()}</Link>
      </nav>
    </div>
  );
}
