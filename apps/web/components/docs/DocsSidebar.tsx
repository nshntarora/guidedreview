"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_PAGES, docsPath } from "@/config/docs";
import { cn } from "@guided-review/ui";

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="w-full">
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {DOCS_PAGES.map((page, idx) => {
          const href = docsPath(page.slug);
          const active = pathname === href;
          // Section headings render above the first page of each section.
          const heading = page.section !== DOCS_PAGES[idx - 1]?.section ? page.section : null;

          return (
            <li key={href}>
              {heading ? (
                <div
                  className={cn(
                    "mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted",
                    idx === 0 ? "mt-0" : "mt-5",
                  )}
                >
                  {heading}
                </div>
              ) : null}
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  "mb-0.5 block rounded-md border-b-0 px-2.5 py-1.5 text-sm no-underline transition-colors hover:border-b-transparent",
                  active
                    ? "bg-surface-raised font-medium text-foreground"
                    : "text-muted hover:bg-surface-raised/70 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {page.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
