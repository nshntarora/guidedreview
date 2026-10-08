import Link from "next/link";
import { formatArticleMonthYear, type Article } from "@web/config/articles";
import { JsonLd } from "@web/components/JsonLd";
import { SITE_URL } from "@web/lib/site";

export function ArticleIndex({
  title,
  description,
  path,
  articles,
}: {
  title: string;
  description: string;
  path: string;
  articles: Article[];
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description,
          url: `${SITE_URL}${path}`,
          hasPart: articles.map((article) => ({
            "@type": "Article",
            headline: article.title,
            url: `${SITE_URL}${article.path}`,
          })),
        }}
      />
      <header className="mb-12 max-w-2xl">
        <p className="mb-4 text-xs uppercase tracking-widest text-primary">Read the change</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{description}</p>
      </header>
      <ul className="grid list-none gap-6 p-0 sm:grid-cols-2">
        {articles.map((article) => (
          <li key={article.slug} className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <article>
              <p className="mb-4 text-xs uppercase tracking-widest text-muted">
                {article.tool ? (
                  "Tool comparison"
                ) : (
                  <>
                    Updated{" "}
                    <time dateTime={article.lastModified}>
                      {path === "/guides"
                        ? formatArticleMonthYear(article.lastModified)
                        : article.lastModified}
                    </time>
                  </>
                )}
              </p>
              <h2 className="text-xl font-semibold leading-snug">
                <Link href={article.path} data-testid={`article-${article.slug}`}>
                  {article.tool ? `Guided Review vs ${article.tool}` : article.title}
                </Link>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">{article.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
