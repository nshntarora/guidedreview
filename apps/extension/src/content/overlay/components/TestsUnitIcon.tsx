/** Flask mark for `kind: "tests"` review units — filled via currentColor. */
export function TestsUnitIcon({
  className,
  size = 14,
  "data-testid": testId = "unit-tests-icon",
}: {
  className?: string;
  size?: number;
  "data-testid"?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-testid={testId}
    >
      {/* Simple flask: neck + bulb */}
      <path d="M6.25 1.5a.75.75 0 0 0 0 1.5h.5v3.38L3.22 12.1A2 2 0 0 0 4.9 15h6.2a2 2 0 0 0 1.68-2.9L9.25 6.38V3h.5a.75.75 0 0 0 0-1.5h-3.5ZM7.75 6.9l3.35 5.58a.5.5 0 0 1-.42.72H5.32a.5.5 0 0 1-.42-.72L8.25 6.9V3h-.5v3.9Z" />
    </svg>
  );
}
