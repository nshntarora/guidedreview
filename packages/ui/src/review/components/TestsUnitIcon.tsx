/** Lab flask mark for `kind: "tests"` review units — stroke via currentColor. */
export function TestsUnitIcon({
  className,
  /** Defaults to `1em` so the mark tracks surrounding text size. */
  size = "1em",
  "data-testid": testId = "unit-tests-icon",
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
      {/* Outline lab flask: neck, bulb, liquid line */}
      <path
        d="M6 1.75h4M7 1.75v3.1L3.35 11.2A2.25 2.25 0 0 0 5.28 14.5h5.44a2.25 2.25 0 0 0 1.93-3.3L9 4.85V1.75"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.2 9.75h7.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
