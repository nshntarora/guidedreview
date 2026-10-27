import { Button, Kbd } from "@guided-review/ui";

interface FooterNavProps {
  /** Zero is the summary; actual files/units start at one. */
  currentIndex: number;
  total: number;
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

export function FooterNav({ currentIndex, total, label, onPrev, onNext }: FooterNavProps) {
  return (
    <footer
      className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-5 py-3"
      aria-label="Review navigation"
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={currentIndex === 0}
        data-testid="review-previous-unit"
      >
        Previous <Kbd>←</Kbd>
      </Button>
      <p
        className="m-0 min-w-0 text-center text-base tabular-nums text-muted"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="footer-step-status"
      >
        {label}
      </p>
      <Button
        size="sm"
        onClick={onNext}
        disabled={currentIndex >= total}
        data-testid="review-next-unit"
      >
        Next <Kbd>→</Kbd>
      </Button>
    </footer>
  );
}
