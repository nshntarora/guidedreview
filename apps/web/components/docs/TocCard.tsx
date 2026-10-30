import Link from "next/link";
import type { TocEntry } from "@web/config/docs";

export function TocCard({ toc, collapsible = false }: { toc: TocEntry[]; collapsible?: boolean }) {
  if (!toc.length) return null;

  const contents = (
    <nav aria-label="On this page" className="not-prose my-6">
      {!collapsible && (
        <div className="mb-3 text-xs uppercase tracking-widest text-muted">On this page</div>
      )}
      <ol className="space-y-2 p-0">
        {toc.map(({ id, label, level }) => (
          <li key={id} className={level === 3 ? "pl-3" : ""}>
            <Link
              href={`#${id}`}
              data-testid={`toc-link-${id}`}
              className="list-item border-b-0 py-0.5 text-sm leading-snug text-muted no-underline transition-colors hover:border-b-transparent hover:text-foreground"
            >
              {label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );

  if (!collapsible) return contents;

  return (
    <details
      className="my-6 rounded-lg border border-border px-4 lg:hidden"
      data-testid="guide-mobile-toc"
    >
      <summary
        data-testid="guide-mobile-toc-toggle"
        className="cursor-pointer py-3 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        On this page
      </summary>
      {contents}
    </details>
  );
}
