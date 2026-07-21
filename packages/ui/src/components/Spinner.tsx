import { cn } from "../cn";
import type { Surface } from "../surface";

interface SpinnerProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  /** Visual size in pixels. Defaults to 24. */
  size?: number;
  /**
   * Token set: `app` (options + marketing) or `overlay` (dark review UI).
   * Defaults to `overlay` for back-compat with existing overlay usage.
   */
  surface?: Surface;
  className?: string;
}

export function Spinner({
  label = "Loading",
  size = 24,
  surface = "overlay",
  className,
}: SpinnerProps) {
  const thin = size <= 16;
  return (
    <span
      className={cn(
        "inline-block shrink-0 animate-gr-spin rounded-full border-solid",
        thin ? "border-2" : "border-[3px]",
        surface === "app"
          ? "border-opt-border border-t-opt-text"
          : "border-gr-border border-t-gr-accent",
        className,
      )}
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
    />
  );
}
