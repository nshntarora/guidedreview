"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { helpNavigation } from "@/config/help-navigation";
import { cn } from "@guided-review/ui";

type DocsSidebarProps = {
  basePath?: "/docs";
  onNavigate?: () => void;
};

export function DocsSidebar({ basePath = "/docs", onNavigate }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="w-full">
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {helpNavigation.map((item, idx) => {
          if (item.type === "heading") {
            return (
              <li
                key={`h-${idx}`}
                className={cn(
                  "mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted",
                  idx === 0 ? "mt-0" : "mt-5",
                )}
              >
                {item.title}
              </li>
            );
          }

          const href = item.slug ? `${basePath}/${item.slug}` : basePath;
          const active = pathname === href || (item.slug === "" && pathname === basePath);

          return (
            <li key={href}>
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
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
