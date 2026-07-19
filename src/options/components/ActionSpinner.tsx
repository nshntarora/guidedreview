interface ActionSpinnerProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  /** Visual size in pixels. Defaults to 14. */
  size?: number;
}

/** Small spinner for options-page button loading states. */
export function ActionSpinner({ label = "Loading", size = 14 }: ActionSpinnerProps) {
  return (
    <span
      className="inline-block shrink-0 animate-gr-spin rounded-full border-2 border-solid border-opt-border border-t-opt-text"
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
    />
  );
}
