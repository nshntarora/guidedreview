/** Checkmark for units the reviewer marked viewed — stroke via currentColor. */
export function ViewedUnitIcon({
  className,
  /** Defaults to `1em` so the mark tracks surrounding text size. */
  size = "1em",
  "data-testid": testId = "unit-viewed-icon",
}: {
  className?: string;
  size?: number | string;
  "data-testid"?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-testid={testId}
    >
      <path
        d="M3.25 8.25 6.5 11.5 12.75 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
