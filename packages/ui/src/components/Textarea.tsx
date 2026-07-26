import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../cn";
import type { Surface } from "../surface";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Token set: `app` (options + marketing, opt-*) or `overlay` (dark review UI, gr-*).
   * Defaults to `app`.
   */
  surface?: Surface;
}

export function textareaClassName({
  surface = "app",
  className,
}: {
  surface?: Surface;
  className?: string;
} = {}): string {
  return cn(
    "min-h-[88px] w-full resize-y rounded-md border px-3 py-2 font-sans text-base leading-relaxed",
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

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { surface = "app", className, ...props },
  ref,
) {
  return <textarea ref={ref} className={textareaClassName({ surface, className })} {...props} />;
});
