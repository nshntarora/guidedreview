import { notFound } from "next/navigation";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RELEASES, formatReleaseDate, releasePath } from "@web/lib/releases";
import { openGraphSite } from "@web/lib/site";

type Props = { params: Promise<{ version: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return RELEASES.map(({ version }) => ({ version }));
}

async function getRelease(params: Props["params"]) {
  const { version } = await params;
  const release = RELEASES.find((release) => release.version === version);
  if (!release) notFound();
  return release;
}

export async function generateMetadata({ params }: Props) {
  const release = await getRelease(params);
  const path = releasePath(release.version);
  return {
    title: release.title,
    description: release.description,
    alternates: { canonical: path },
    openGraph: {
      ...openGraphSite,
      type: "article",
      url: path,
      publishedTime: release.publishedAt,
      modifiedTime: release.updatedAt,
    },
  };
}

export default async function ReleasePage({ params }: Props) {
  const release = await getRelease(params);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 font-mono text-xs">
        <Link href="/changelog">← All releases</Link>
      </nav>
      <article data-testid="release-notes">
        <header className="mb-10">
          <div className="mb-6 flex flex-wrap items-center gap-4 border-y border-border py-4 font-mono text-xs">
            <span className="text-primary">v{release.version}</span>
            <time dateTime={release.publishedAt} className="text-muted">
              {formatReleaseDate(release.publishedAt)}
            </time>
          </div>
          <h1 className="font-brand text-3xl font-bold leading-snug tracking-tight text-balance sm:text-5xl">
            {release.title}
          </h1>
        </header>
        <div className="article-content min-w-0 break-words">
          <Markdown
            remarkPlugins={[remarkGfm]}
            skipHtml
            components={{ h1: ({ children }) => <h2>{children}</h2> }}
          >
            {release.body}
          </Markdown>
        </div>
      </article>
      <nav
        aria-label="Release links"
        className="mt-12 flex flex-wrap justify-between gap-4 border-t border-border pt-6 font-mono text-xs"
      >
        <Link href="/changelog">← All releases</Link>
        <a href={release.url}>View on GitHub ↗</a>
      </nav>
    </div>
  );
}
