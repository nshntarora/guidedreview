interface SpinnerProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  /** Visual size in pixels. Defaults to 24. */
  size?: number;
}

export function Spinner({ label = "Loading", size = 24 }: SpinnerProps) {
  return (
    <div
      className="inline-block shrink-0 animate-gr-spin rounded-full border-[3px] border-solid border-gr-border border-t-gr-accent"
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
    />
  );
}
