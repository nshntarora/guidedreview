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
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-24">
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
      <header className="mb-12 max-w-3xl sm:mb-16">
        <p className="mb-6 font-mono text-xs text-muted">
          Guided Review{" "}
          <span aria-hidden="true" className="mx-2 text-primary">
            /
          </span>
          {path === "/compare" ? "Compare" : "Field notes"}
        </p>
        <h1 className="font-brand text-3xl font-bold leading-snug tracking-tight text-balance sm:text-5xl sm:leading-snug">
          {path === "/compare" ? (
            <>
              Find your{" "}
              <span className="rounded-md bg-primary px-2 text-primary-foreground">
                review workflow.
              </span>
            </>
          ) : (
            <>
              Read the change.
              <br />
              <span className="rounded-md bg-primary px-2 text-primary-foreground">
                Make the call.
              </span>
            </>
          )}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{description}</p>
      </header>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-raised px-5 py-3 font-mono text-xs text-muted sm:px-8">
          <span>{path === "/compare" ? "compare / tools" : "guides / code review"}</span>
          <span>
            {articles.length} {path === "/compare" ? "comparisons" : "guides"}
          </span>
        </div>
        <ul className="m-0 list-none divide-y divide-border p-0">
          {articles.map((article, index) => (
            <li key={article.slug}>
              <article>
                <Link
                  href={article.path}
                  data-testid={`article-${article.slug}`}
                  className="group inline-flex w-full items-start gap-4 px-5 py-7 text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:gap-7 sm:px-8 sm:py-9"
                >
                  <span aria-hidden="true" className="pt-1 font-mono text-xs text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-3 font-mono text-xs text-muted">
                      {article.toolLogo ? (
                        <img
                          src={article.toolLogo}
                          alt={article.tool}
                          width="180"
                          height="32"
                          className="h-6 w-36 object-contain object-left"
                        />
                      ) : (
                        <>
                          Updated{" "}
                          <time dateTime={article.lastModified}>
                            {formatArticleMonthYear(article.lastModified)}
                          </time>
                        </>
                      )}
                    </p>
                    <h2 className="font-brand text-lg font-semibold leading-relaxed tracking-tight transition-colors group-hover:text-primary sm:text-xl">
                      {article.tool ? `Guided Review vs ${article.tool}` : article.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                      {article.description}
                    </p>
                  </div>
                  <span aria-hidden="true" className="pt-1 text-xl text-primary">
                    ↗
                  </span>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 font-mono text-xs leading-relaxed text-muted">
        AI structures the review. You decide what ships.
      </p>
    </section>
  );
}
