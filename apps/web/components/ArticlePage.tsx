import type { Metadata } from "next";
import Link from "next/link";
import { formatArticleMonthYear, type Article } from "@web/config/articles";
import { JsonLd } from "@web/components/JsonLd";
import { COMPARISONS } from "@web/config/compare";
import { GUIDES } from "@web/config/guides";
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
  const related = (sectionPath === "/guides" ? GUIDES : COMPARISONS).filter(
    (item) => item.slug !== article.slug,
  );
  const organization = { "@type": "Organization", name: SITE_NAME, url: SITE_URL };
  const displayLastModified = formatArticleMonthYear(article.lastModified);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 font-mono text-xs">
        <Link href={sectionPath}>← All {section.toLowerCase()}</Link>
      </nav>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-border py-4 font-mono text-xs text-muted">
        <span>
          <span className="text-primary">{section}</span> / Guided Review
        </span>
        <span>
          Updated <time dateTime={article.lastModified}>{displayLastModified}</time>
        </span>
      </div>
      <div className="grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-14">
        <article className="article-content min-w-0" data-testid="article-content">
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
          {article.toolLogo && (
            <div className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface px-5 py-6 sm:gap-6">
              <img
                src="/assets/logo.svg"
                alt="Guided Review"
                width="350"
                height="49"
                className="h-7 w-28 object-contain sm:w-36"
              />
              <span className="font-mono text-xs text-muted">vs</span>
              <img
                src={article.toolLogo}
                alt={article.tool}
                width="180"
                height="32"
                className="h-7 w-28 object-contain sm:w-36"
              />
            </div>
          )}
          <Content />
        </article>
        <aside className="min-w-0">
          <nav
            aria-label="More reading"
            className="rounded-xl border border-border bg-surface lg:sticky lg:top-28"
          >
            <p className="border-b border-border bg-surface-raised px-5 py-3 font-mono text-xs text-muted rounded-t-xl">
              Keep reading
            </p>
            <ul className="m-0 list-none space-y-5 p-5">
              {related.map((item) => (
                <li key={item.slug} className="text-sm leading-relaxed">
                  <Link href={item.path}>
                    {item.tool ? `Guided Review vs ${item.tool}` : item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
      <nav
        aria-label="Back to collection"
        className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 font-mono text-xs"
      >
        <Link href={sectionPath}>← All {section.toLowerCase()}</Link>
        <Link href={sectionPath === "/guides" ? "/compare" : "/guides"}>
          {sectionPath === "/guides" ? "Compare tools" : "Browse guides"} →
        </Link>
      </nav>
    </div>
  );
}
