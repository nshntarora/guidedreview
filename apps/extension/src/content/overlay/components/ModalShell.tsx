import type { MouseEvent, ReactNode, Ref } from "react";
import { cn } from "@guided-review/ui";

interface ModalShellProps {
  /** `fixed` for dialogs that must sit above the overlay's own fixed root (confirmation); `absolute` otherwise. */
  position?: "fixed" | "absolute";
  zIndexClassName?: string;
  scrimTestId: string;
  /** Click-outside dismiss; omit (or pass `undefined`) to make the scrim non-dismissable by click. */
  onScrimDismiss?: () => void;
  maxWidthClassName: string;
  panelClassName?: string;
  panelRef?: Ref<HTMLDivElement>;
  /** Spread onto the panel element: role, aria-*, data-testid, data-*. */
  panelProps: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Scrim + centered panel shared by the overlay's dialogs (Submit Review,
 * Connect GitHub, Review Submitted, Confirmation). Header/body/footer stay
 * per-modal; this only owns the structural wrapper that was previously
 * duplicated across all four.
 */
export function ModalShell({
  position = "absolute",
  zIndexClassName = "z-50",
  scrimTestId,
  onScrimDismiss,
  maxWidthClassName,
  panelClassName,
  panelRef,
  panelProps,
  children,
}: ModalShellProps) {
  return (
    <div
      className={cn(
        position === "fixed" ? "fixed" : "absolute",
        "inset-0 flex items-center justify-center bg-black/60 p-4",
        zIndexClassName,
      )}
      data-testid={scrimTestId}
      onClick={
        onScrimDismiss
          ? (e: MouseEvent<HTMLDivElement>) => {
              if (e.target === e.currentTarget) onScrimDismiss();
            }
          : undefined
      }
    >
      <div
        ref={panelRef}
        className={cn(
          "flex w-full flex-col rounded-lg border border-border bg-background shadow-xl",
          maxWidthClassName,
          panelClassName,
        )}
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        {...panelProps}
      >
        {children}
      </div>
    </div>
  );
}

/** Close-X glyph shared by icon-only and labeled close controls. */
export function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Shared close-X icon button used by the overlay's header-style dialogs. */
export function CloseButton({
  onClick,
  disabled,
  testId,
}: {
  onClick: () => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-surface p-1.5 text-muted hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
      disabled={disabled}
      aria-label="Close"
      data-testid={testId}
    >
      <CloseIcon />
    </button>
  );
}
