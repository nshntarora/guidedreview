import { cn } from "../cn";

interface SpinnerProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  /** Visual size in pixels. Defaults to 24. */
  size?: number;
  className?: string;
}

export function Spinner({ label = "Loading", size = 24, className }: SpinnerProps) {
  const thin = size <= 16;
  return (
    <span
      className={cn(
        "inline-block shrink-0 animate-gr-spin rounded-full border-solid border-border border-t-primary",
        thin ? "border-2" : "border-[3px]",
        className,
      )}
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
    />
  );
}
