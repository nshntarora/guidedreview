import Link from "next/link";
import { cn } from "@guided-review/ui";
import type { TocEntry } from "@/components/docs/TableOfContents";

export function TocCard({ toc }: { toc: TocEntry[] }) {
  if (!toc.length) return null;

  return (
    <nav aria-label="On this page" className="not-prose my-6">
      <div className="mb-3 text-xs uppercase tracking-widest text-muted">On this page</div>
      <ol className="p-0">
        {toc.map(({ id, label, level }) => (
          <li key={id} className={level === 3 ? "pl-3" : ""}>
            <Link
              href={`#${id}`}
              className={cn(
                "list-item border-b-0 py-0.5 text-sm leading-snug text-muted no-underline transition-colors hover:border-b-transparent hover:text-foreground",
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
