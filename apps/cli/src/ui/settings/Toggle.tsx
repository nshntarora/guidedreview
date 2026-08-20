import { cn } from "@guided-review/ui";

export function Toggle({
  id,
  checked,
  onChange,
  disabled = false,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  className,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  className?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "border-primary bg-primary" : "border-border bg-surface-raised",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full shadow-sm transition-transform",
          checked ? "translate-x-5 bg-primary-foreground" : "translate-x-0 bg-muted",
        )}
      />
    </button>
  );
}
