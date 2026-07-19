interface SpinnerProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  /** Visual size in pixels. Defaults to 24. */
  size?: number;
}

export function Spinner({ label = "Loading", size = 24 }: SpinnerProps) {
  return (
    <div
      className="gr-spinner"
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
    />
  );
}
