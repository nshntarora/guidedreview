import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../cn";
import type { Surface } from "../surface";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Token set: `app` (options + marketing, opt-*) or `overlay` (dark review UI, gr-*).
   * Defaults to `app`.
   */
  surface?: Surface;
}

export function inputClassName({
  surface = "app",
  className,
}: {
  surface?: Surface;
  className?: string;
} = {}): string {
  return cn(
    "w-full rounded-md border px-2.5 py-2 text-base",
    "disabled:cursor-not-allowed disabled:opacity-60",
    surface === "overlay"
      ? cn(
          "border-gr-border bg-gr-bg text-gr-text placeholder:text-gr-faint",
          "focus:border-gr-accent focus:outline-none",
        )
      : cn(
          "border-opt-border bg-opt-subtle text-opt-text placeholder:text-opt-muted",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-opt-accent",
        ),
    className,
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { surface = "app", className, ...props },
  ref,
) {
  return <input ref={ref} className={inputClassName({ surface, className })} {...props} />;
});
