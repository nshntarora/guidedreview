import type { Metadata } from "next";
import Link from "next/link";
import { RELEASES, formatReleaseDate, releasePath } from "@web/lib/releases";
import { GITHUB_REPO_URL } from "@web/lib/links";
import { openGraphSite } from "@web/lib/site";

const description =
  "What changed in Guided Review. New features, fixes, and improvements to the Chrome extension and local review CLI, published with each GitHub release.";

export const metadata: Metadata = {
  title: "Changelog",
  description,
  alternates: { canonical: "/changelog" },
  openGraph: { ...openGraphSite, type: "website", url: "/changelog" },
};

export default function ChangelogPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-24">
      <header className="mb-12 max-w-3xl sm:mb-16">
        <p className="mb-6 font-mono text-xs text-muted">
          Guided Review{" "}
          <span aria-hidden="true" className="mx-2 text-primary">
            /
          </span>{" "}
          Changelog
        </p>
        <h1 className="font-brand text-4xl font-bold tracking-tight sm:text-5xl">What changed.</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Features, fixes, and the details behind each release.
        </p>
        <p className="mt-4 text-sm text-muted">
          Published from <a href={`${GITHUB_REPO_URL}/releases`}>GitHub releases</a>.
        </p>
      </header>
      <ol className="m-0 list-none divide-y divide-border border-y border-border p-0">
        {RELEASES.map((release) => (
          <li key={release.version} className="py-8 sm:py-10">
            <article className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
              <div className="flex flex-wrap items-baseline gap-3 font-mono text-xs sm:block">
                <span className="text-primary">v{release.version}</span>
                <time dateTime={release.publishedAt} className="text-muted sm:mt-3 sm:block">
                  {formatReleaseDate(release.publishedAt)}
                </time>
              </div>
              <div>
                <h2 className="font-brand text-2xl font-semibold leading-snug tracking-tight">
                  <Link
                    href={releasePath(release.version)}
                    data-testid={`release-${release.version}`}
                  >
                    {release.title}
                  </Link>
                </h2>
                <p className="mt-4 max-w-2xl leading-relaxed text-muted">{release.description}</p>
                <Link
                  href={releasePath(release.version)}
                  className="mt-5 inline-flex font-mono text-xs text-primary"
                >
                  Read release notes{" "}
                  <span aria-hidden="true" className="ml-2">
                    →
                  </span>
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ol>
      {RELEASES.length === 0 && <p className="py-8 text-muted">No published releases yet.</p>}
    </section>
  );
}
