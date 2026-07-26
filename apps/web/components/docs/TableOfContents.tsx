"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@guided-review/ui";

export type TocEntry = {
  id: string;
  label: string;
  level: 2 | 3;
};

export function TableOfContents({ toc }: { toc: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!toc.length) return;

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
          break;
        }
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: "-10% 0px -70% 0px",
      threshold: 0,
    });

    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [toc]);

  if (!toc.length) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-opt-muted">
        On this page
      </p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {toc.map(({ id, label, level }) => (
          <li key={id} className={level === 3 ? "pl-3" : ""}>
            <Link
              href={`#${id}`}
              className={cn(
                "block border-b-0 py-0.5 leading-snug text-opt-muted no-underline transition-colors hover:border-b-transparent hover:text-opt-text",
                activeId === id && "font-medium text-opt-text",
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
