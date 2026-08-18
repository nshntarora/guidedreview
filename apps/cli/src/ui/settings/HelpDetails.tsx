import type { ReactNode } from "react";
import { cn } from "@guided-review/ui";

export function HelpDetails({
  title,
  titleId,
  children,
}: {
  title: string;
  titleId?: string;
  children: ReactNode;
}) {
  return (
    <details className="group">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 py-2.5",
          "[&::-webkit-details-marker]:hidden",
          "focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        )}
      >
        <h3
          id={titleId}
          className="m-0 font-brand text-sm font-semibold tracking-tight text-foreground"
        >
          {title}
        </h3>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="pb-3 text-sm leading-relaxed text-muted">{children}</div>
    </details>
  );
}
