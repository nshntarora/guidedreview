import Link from "next/link";

export function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
      <p className="m-0 text-sm font-medium uppercase tracking-wider text-opt-muted">
        Chrome extension for GitHub
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Review pull requests in a guided order
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-opt-muted">
        Guided Review turns a PR diff into an ordered sequence of review units — schema first, then
        logic, call-sites, and tests — so you walk the change the way a careful human would.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <a
          href="#install"
          className="inline-flex items-center rounded-lg border border-opt-accent bg-opt-accent px-5 py-2.5 text-base font-semibold text-opt-accent-on no-underline hover:bg-opt-accent-hover"
        >
          Install the extension
        </a>
        <Link
          href="/#features"
          className="inline-flex items-center rounded-lg border border-opt-border bg-opt-subtle px-5 py-2.5 text-base font-medium text-opt-text no-underline hover:border-opt-muted"
        >
          See how it works
        </Link>
      </div>
    </section>
  );
}
