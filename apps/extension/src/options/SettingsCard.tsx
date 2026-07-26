import type { ReactNode } from "react";
import { cn } from "@guided-review/ui";

export interface SettingsCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Optional decorative icon shown before the title. */
  icon?: ReactNode;
  /** Optional id for the title heading (aria-labelledby). */
  titleId?: string;
  "data-testid"?: string;
}

/**
 * Bordered section panel for the options page — landing-card language
 * without WindowFrame traffic lights.
 */
export function SettingsCard({
  title,
  description,
  children,
  className,
  icon,
  titleId,
  "data-testid": dataTestId,
}: SettingsCardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-opt-border bg-opt-subtle/50 px-4 py-4 sm:px-5 sm:py-5",
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
            className="m-0 font-brand text-lg font-bold tracking-tight text-opt-text"
          >
            {title}
          </h2>
        </div>
        {description ? (
          <div className="mt-1.5 text-sm leading-relaxed text-opt-muted">{description}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}
