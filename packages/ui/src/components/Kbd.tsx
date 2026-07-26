import type { ComponentProps } from "react";
import { cn } from "../cn";
import type { Surface } from "../surface";

export type KbdProps = ComponentProps<"kbd"> & {
  /**
   * Token set: `app` (options + marketing, opt-*) or `overlay` (dark review UI, gr-*).
   * Defaults to `overlay` for back-compat with existing review UI usage.
   */
  surface?: Surface;
};

/**
 * Keyboard key badge — mirrors shadcn/ui `Kbd`.
 * @see https://ui.shadcn.com/docs/components/kbd
 */
function Kbd({ className, surface = "overlay", ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm border px-1 font-sans text-sm",
        "[&_svg:not([class*='size-'])]:size-3 opacity-75",
        surface === "app"
          ? "border-opt-border bg-opt-subtle text-opt-muted"
          : "border-gr-border bg-gr-subtle text-gr-muted",
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
