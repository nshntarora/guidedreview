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
  const stepLabel = total > 0 ? `Step ${currentIndex + 1} of ${total}` : "No steps yet";

  return (
    <footer
      className="flex shrink-0 items-center justify-between gap-3 border-t border-gr-border bg-gr-chrome px-5 py-3"
      aria-label="Review navigation"
    >
      <button
        type="button"
        className={cn(
          navBtnBase,
          "border-gr-border bg-gr-bg text-gr-text",
          "[&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit",
        )}
        onClick={onPrev}
        disabled={currentIndex === 0 || total === 0}
        aria-label="Previous step"
      >
        Previous
        <Kbd>←</Kbd>
      </button>

      <p
        className="m-0 min-w-0 text-center text-base tabular-nums text-gr-muted"
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
          "border-gr-accent bg-gr-accent text-gr-accent-on transition-colors",
          "not-disabled:hover:border-gr-accent-hover not-disabled:hover:bg-gr-accent-hover",
          "[&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit",
        )}
        onClick={onNext}
        disabled={total === 0 || currentIndex >= total - 1}
        aria-label="Next step"
      >
        Next
        <Kbd>→</Kbd>
      </button>
    </footer>
  );
}
