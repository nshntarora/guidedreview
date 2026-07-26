import type { ComponentProps } from "react";
import { cn } from "../cn";

export type KbdProps = ComponentProps<"kbd">;

/**
 * Keyboard key badge — mirrors shadcn/ui `Kbd`.
 * @see https://ui.shadcn.com/docs/components/kbd
 */
function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-border bg-surface-muted px-1 font-sans text-sm text-muted",
        "[&_svg:not([class*='size-'])]:size-3 opacity-75",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Groups adjacent key badges — mirrors shadcn/ui `KbdGroup`.
 */
function KbdGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
