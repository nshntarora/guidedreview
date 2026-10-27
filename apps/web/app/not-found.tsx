import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@guided-review/ui";
import { DeveloperJoke } from "@web/components/DeveloperJoke";
import { GITHUB_REPO_URL, INSTALL_SECTION_HREF } from "@web/lib/links";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="not-found-title"
      data-testid="not-found"
    >
      <p className="font-brand text-7xl font-semibold tracking-tight text-primary sm:text-9xl">
        404
      </p>
      <h1
        id="not-found-title"
        className="mt-6 font-brand text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        This page didn’t make the commit.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        The page may have moved, or the URL has a typo. Try one of the links below.
      </p>

      <nav aria-label="Find your way back" className="mt-8 flex flex-wrap items-center gap-3">
        <Link href="/" className={buttonClassName()} data-testid="not-found-home">
          Back to home
        </Link>
        <Link
          href="/docs"
          className={buttonClassName({ variant: "secondary" })}
          data-testid="not-found-docs"
        >
          Docs
        </Link>
        <Link
          href={INSTALL_SECTION_HREF}
          className={buttonClassName({ variant: "secondary" })}
          data-testid="not-found-install"
        >
          Install
        </Link>
        <a
          href={GITHUB_REPO_URL}
          className={buttonClassName({ variant: "secondary" })}
          data-testid="not-found-github"
        >
          GitHub
        </a>
      </nav>

      <DeveloperJoke />
    </section>
  );
}
