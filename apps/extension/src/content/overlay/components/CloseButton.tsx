/** Shared close-X icon button used by the overlay's header-style dialogs. */
export function CloseButton({
  onClick,
  disabled,
  testId,
}: {
  onClick: () => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-surface p-1.5 text-muted hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
      disabled={disabled}
      aria-label="Close"
      data-testid={testId}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
