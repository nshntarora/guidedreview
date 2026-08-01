import Link from "next/link";
import { DOCS_PAGES, docsPath } from "@/config/docs";

export function DocsPager({ slug }: { slug: string }) {
  const currentIndex = DOCS_PAGES.findIndex((p) => p.slug === slug);
  const prev = currentIndex > 0 ? DOCS_PAGES[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < DOCS_PAGES.length - 1 ? DOCS_PAGES[currentIndex + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-6">
      {prev ? (
        <Link
          href={docsPath(prev.slug)}
          className="group inline-flex h-auto flex-col items-start gap-1 rounded-lg border border-border bg-surface-raised/40 p-4 no-underline transition-colors hover:border-muted hover:bg-surface-raised"
        >
          <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted">
            ← Previous
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-foreground">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={docsPath(next.slug)}
          className="group inline-flex h-auto flex-col items-end gap-1 rounded-lg border border-border bg-surface-raised/40 p-4 no-underline transition-colors hover:border-muted hover:bg-surface-raised"
        >
          <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted">
            Next →
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-foreground">
            {next.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
