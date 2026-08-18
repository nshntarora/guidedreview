import type { ReactNode } from "react";
import { cn } from "../cn";

export function Card({
  title,
  description,
  children,
  className,
  icon,
  titleId,
  "data-testid": dataTestId,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  titleId?: string;
  "data-testid"?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-surface-raised/50 px-4 py-4 sm:px-5 sm:py-5",
        className,
      )}
      aria-labelledby={titleId}
      data-testid={dataTestId}
    >
      <header className="mb-4">
        <div className="flex items-center gap-2.5">
          {icon}
          <h2
            id={titleId}
            className="m-0 font-brand text-lg font-bold tracking-tight text-foreground"
          >
            {title}
          </h2>
        </div>
        {description ? (
          <div className="mt-1.5 text-sm leading-relaxed text-muted">{description}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}
