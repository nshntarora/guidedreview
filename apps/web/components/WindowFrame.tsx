import type { ReactNode } from "react";
import { cn } from "@guided-review/ui";

type WindowFrameProps = {
  /** Tab label rendered in the title bar, e.g. "why.md". */
  label: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/**
 * Editor-window chrome (traffic-light dots + monospace filename tab) used to
 * frame content blocks, echoing ProductVideo's player frame so the whole page
 * reads as one continuous "editor" rather than isolated card styles per section.
 */
export function WindowFrame({ label, children, className, bodyClassName }: WindowFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-opt-border bg-opt-subtle/50 shadow-[0_1px_0_rgba(0,0,0,0.02)]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-opt-border bg-opt-bg/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-gr-danger/70" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-gr-syntax-variable/70" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-gr-add-text/70" aria-hidden="true" />
        <span className="ml-2.5 truncate font-mono text-xs text-opt-muted">{label}</span>
      </div>
      <div className={cn("p-6 sm:p-8", bodyClassName)}>{children}</div>
    </div>
  );
}
