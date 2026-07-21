import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";
import type { Surface } from "../surface";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /**
   * Token set: `app` (options + marketing, opt-*) or `overlay` (dark review UI, gr-*).
   * Defaults to `app`.
   */
  surface?: Surface;
  children?: ReactNode;
}

export function Label({ surface = "app", className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-base font-semibold",
        surface === "overlay" ? "text-gr-text" : "text-opt-text",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
