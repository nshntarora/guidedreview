import { cn } from "@guided-review/ui";

export interface StatusCalloutProps {
  kind: "ok" | "error";
  message: string;
  className?: string;
}

/** Compact save / connection status strip for the options form. */
export function StatusCallout({ kind, message, className }: StatusCalloutProps) {
  const text = kind === "error" ? `Error: ${message}` : message;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "m-0 rounded-md border px-3 py-2 text-base",
        kind === "ok" && "border-opt-border bg-opt-bg/60 text-opt-ok",
        kind === "error" &&
          "border-[color-mix(in_srgb,var(--opt-error)_35%,var(--opt-border))] bg-[color-mix(in_srgb,var(--opt-error)_10%,var(--opt-subtle))] text-opt-error",
        className,
      )}
    >
      {text}
    </p>
  );
}
