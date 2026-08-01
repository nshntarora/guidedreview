import { cn, Kbd } from "@guided-review/ui";

interface FooterNavProps {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const navBtnBase =
  "inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-[7px] text-base font-medium disabled:cursor-default disabled:opacity-40";

export function FooterNav({ currentIndex, total, onPrev, onNext }: FooterNavProps) {
  const stepLabel =
    total > 0 ? `Review unit ${currentIndex + 1} of ${total}` : "No review units yet";

  return (
    <footer
      className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-5 py-3"
      aria-label="Review navigation"
    >
      <button
        type="button"
        className={cn(navBtnBase, "border-border bg-surface text-foreground")}
        onClick={onPrev}
        disabled={currentIndex === 0 || total === 0}
        aria-label="Previous review unit"
      >
        Previous
        <Kbd>←</Kbd>
      </button>

      <p
        className="m-0 min-w-0 text-center text-base tabular-nums text-muted"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="footer-step-status"
      >
        {stepLabel}
      </p>

      <button
        type="button"
        className={cn(
          navBtnBase,
          "border-primary bg-primary text-primary-foreground transition-colors",
          "not-disabled:hover:border-primary-hover not-disabled:hover:bg-primary-hover",
          "[&_[data-slot=kbd]]:bg-[rgba(13,8,6,0.12)] [&_[data-slot=kbd]]:text-inherit",
        )}
        onClick={onNext}
        disabled={total === 0 || currentIndex >= total - 1}
        aria-label="Next review unit"
      >
        Next
        <Kbd>→</Kbd>
      </button>
    </footer>
  );
}
