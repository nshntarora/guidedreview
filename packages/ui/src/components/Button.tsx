import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../cn";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
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
const variants: Record<ButtonVariant, string> = {
  primary: cn(
    "border-primary bg-primary font-semibold text-primary-foreground",
    "not-disabled:hover:border-primary-hover not-disabled:hover:bg-primary-hover",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    // Nested keyboard keys on primary fill need inverted kbd chrome.
    "[&_[data-slot=kbd]]:bg-[rgba(13,8,6,0.12)] [&_[data-slot=kbd]]:text-inherit",
  ),
  secondary: cn(
    "border-border bg-surface-raised font-semibold text-foreground",
    "not-disabled:hover:border-muted not-disabled:hover:bg-[color-mix(in_srgb,var(--color-muted)_10%,var(--color-surface-raised))]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  ),
  destructive: cn(
    "border-danger bg-danger-muted font-semibold text-danger",
    "not-disabled:hover:bg-[color-mix(in_srgb,var(--color-danger)_20%,var(--color-danger-muted))]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger",
    // Nested keyboard keys: darker shade of the danger fill, not neutral surface.
    "[&_[data-slot=kbd]]:border-transparent",
    "[&_[data-slot=kbd]]:bg-[color-mix(in_srgb,black_25%,var(--color-danger-muted))]",
    "[&_[data-slot=kbd]]:text-inherit",
  ),
  ghost: cn(
    "border-transparent bg-transparent font-medium text-muted",
    "not-disabled:hover:bg-surface-muted not-disabled:hover:text-foreground",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  ),
};

/** Class string for buttons and for non-button anchors that should look like buttons. */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex cursor-pointer items-center justify-center border no-underline transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    sizeClasses[size],
    variants[variant],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  );
});
