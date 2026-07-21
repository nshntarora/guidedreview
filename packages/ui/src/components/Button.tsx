import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../cn";
import type { Surface } from "../surface";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Token set: `app` (options + marketing, opt-*) or `overlay` (dark review UI, gr-*).
   * Defaults to `app`.
   */
  surface?: Surface;
  children?: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "gap-1.5 rounded-md px-3 py-1.5 text-base",
  md: "gap-2 rounded-md px-4 py-2 text-base",
  lg: "gap-2 rounded-lg px-5 py-2.5 text-base",
};

/**
 * Hover uses `not-disabled:` (not `enabled:`) so styles apply to both real
 * `<button>`s and anchors/`Link`s styled via `buttonClassName`. CSS `:enabled`
 * only matches form controls, so link-buttons never received hover under the
 * old selector.
 */
const appVariants: Record<ButtonVariant, string> = {
  primary: cn(
    "border-opt-accent bg-opt-accent font-semibold text-opt-accent-on",
    "not-disabled:hover:border-opt-accent-hover not-disabled:hover:bg-opt-accent-hover",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent",
    // Nested keyboard chords on accent fill need inverted kbd chrome.
    "[&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit",
  ),
  secondary: cn(
    "border-opt-border bg-opt-subtle font-semibold text-opt-text",
    "not-disabled:hover:border-opt-muted not-disabled:hover:bg-[color-mix(in_srgb,var(--opt-muted)_10%,var(--opt-subtle))]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent",
  ),
  destructive: cn(
    "border-opt-error bg-opt-subtle font-semibold text-opt-error",
    "not-disabled:hover:bg-[color-mix(in_srgb,var(--opt-error)_12%,var(--opt-subtle))]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-error",
  ),
  ghost: cn(
    "border-transparent bg-transparent font-medium text-opt-muted",
    "not-disabled:hover:bg-opt-subtle not-disabled:hover:text-opt-text",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent",
  ),
};

const overlayVariants: Record<ButtonVariant, string> = {
  primary: cn(
    "border-gr-accent bg-gr-accent font-medium text-gr-accent-on",
    "not-disabled:hover:border-gr-accent-hover not-disabled:hover:bg-gr-accent-hover",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gr-accent",
    // Nested keyboard chords on accent fill need inverted kbd chrome.
    "[&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit",
  ),
  secondary: cn(
    "border-gr-border bg-gr-bg text-gr-muted",
    "not-disabled:hover:bg-gr-subtle not-disabled:hover:text-gr-text",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gr-accent",
  ),
  destructive: cn(
    "border-gr-danger bg-gr-danger-subtle font-medium text-gr-danger",
    "not-disabled:hover:bg-[rgba(255,123,114,0.2)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gr-danger",
  ),
  ghost: cn(
    "border-transparent bg-transparent text-gr-muted",
    "not-disabled:hover:bg-gr-subtle not-disabled:hover:text-gr-text",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gr-accent",
  ),
};

/** Class string for buttons and for non-button anchors that should look like buttons. */
export function buttonClassName({
  variant = "primary",
  size = "md",
  surface = "app",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  surface?: Surface;
  className?: string;
} = {}): string {
  const variants = surface === "overlay" ? overlayVariants : appVariants;
  return cn(
    "inline-flex cursor-pointer items-center justify-center border no-underline transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    sizeClasses[size],
    variants[variant],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    surface = "app",
    className,
    type = "button",
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, surface, className })}
      {...props}
    >
      {children}
    </button>
  );
});
