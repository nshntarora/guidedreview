import type { ReactNode } from "react";
import { cn } from "@guided-review/ui";

type CalloutType = "note" | "tip" | "warning" | "danger";

type CalloutProps = {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
};

const config: Record<CalloutType, { className: string; titleDefault: string }> = {
  note: {
    className: "border-border bg-surface-raised text-foreground",
    titleDefault: "Note",
  },
  tip: {
    className:
      "border-[color-mix(in_srgb,var(--color-success)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-background))] text-foreground",
    titleDefault: "Tip",
  },
  warning: {
    className:
      "border-[color-mix(in_srgb,var(--color-warning)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-background))] text-foreground",
    titleDefault: "Warning",
  },
  danger: {
    className:
      "border-[color-mix(in_srgb,var(--color-danger)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-background))] text-foreground",
    titleDefault: "Danger",
  },
};

export function Callout({ type = "note", title, children }: CalloutProps) {
  const { className, titleDefault } = config[type];
  const label = title ?? titleDefault;

  return (
    <div
      className={cn(
        "callout my-4 flex gap-3 rounded-lg border px-4 py-3",
        `callout-${type}`,
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-sm font-semibold">{label}</div>
        <div className="text-sm leading-relaxed text-muted [&>p]:m-0 [&>p]:leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
