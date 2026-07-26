import Link from "next/link";
import { helpNavigation } from "@/config/help-navigation";

const pages = helpNavigation.filter((item) => item.type !== "heading") as {
  slug: string;
  title: string;
}[];

function getHref(slug: string, basePath: "/docs") {
  return slug ? `${basePath}/${slug}` : basePath;
}

type DocsPagerProps = {
  slug: string;
  basePath?: "/docs";
};

export function DocsPager({ slug, basePath = "/docs" }: DocsPagerProps) {
  const currentIndex = pages.findIndex((p) => p.slug === slug);
  const prev = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-6">
      {prev ? (
        <Link
          href={getHref(prev.slug, basePath)}
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
          href={getHref(next.slug, basePath)}
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
