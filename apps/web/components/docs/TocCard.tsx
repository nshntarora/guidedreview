import Link from "next/link";
import { cn } from "@guided-review/ui";
import type { TocEntry } from "@/components/docs/TableOfContents";

export function TocCard({ toc }: { toc: TocEntry[] }) {
  if (!toc.length) return null;

  return (
    <nav
      aria-label="On this page"
      className="not-prose my-6 rounded-lg border border-opt-border bg-opt-subtle px-5 py-4"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-opt-muted">
        On this page
      </p>
      <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-1.5 p-0 sm:grid-cols-2">
        {toc.map(({ id, label, level }) => (
          <li key={id} className={level === 3 ? "pl-3" : ""}>
            <Link
              href={`#${id}`}
              className={cn(
                "block border-b-0 py-0.5 text-sm leading-snug text-opt-muted no-underline transition-colors hover:border-b-transparent hover:text-opt-text",
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
