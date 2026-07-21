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
          "flex w-full flex-col rounded-lg border border-gr-border bg-gr-chrome shadow-xl",
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
