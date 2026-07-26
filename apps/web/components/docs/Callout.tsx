import type { ReactNode } from "react";
import { cn } from "@guided-review/ui";

export type CalloutType = "note" | "tip" | "warning" | "danger";

export type CalloutProps = {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
};

const config: Record<CalloutType, { className: string; titleDefault: string }> = {
  note: {
    className: "border-opt-border bg-opt-subtle text-opt-text",
    titleDefault: "Note",
  },
  tip: {
    className:
      "border-[color-mix(in_srgb,var(--opt-ok)_40%,var(--opt-border))] bg-[color-mix(in_srgb,var(--opt-ok)_10%,var(--opt-bg))] text-opt-text",
    titleDefault: "Tip",
  },
  warning: {
    className:
      "border-[color-mix(in_srgb,#d4a72c_45%,var(--opt-border))] bg-[color-mix(in_srgb,#d4a72c_12%,var(--opt-bg))] text-opt-text",
    titleDefault: "Warning",
  },
  danger: {
    className:
      "border-[color-mix(in_srgb,var(--opt-error)_40%,var(--opt-border))] bg-[color-mix(in_srgb,var(--opt-error)_10%,var(--opt-bg))] text-opt-text",
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
        <div className="text-sm leading-relaxed text-opt-muted [&>p]:m-0 [&>p]:leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
