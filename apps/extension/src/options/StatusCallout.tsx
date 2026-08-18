import { cn } from "@guided-review/ui";

/** Compact save / connection status strip for the options form. */
export function StatusCallout({
  kind,
  message,
  className,
}: {
  kind: "ok" | "error";
  message: string;
  className?: string;
}) {
  const text = kind === "error" ? `Error: ${message}` : message;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "m-0 rounded-md border px-3 py-2 text-base",
        kind === "ok" && "border-border bg-background/60 text-success",
        kind === "error" &&
          "border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface-raised))] text-danger",
        className,
      )}
    >
      {text}
    </p>
  );
}
