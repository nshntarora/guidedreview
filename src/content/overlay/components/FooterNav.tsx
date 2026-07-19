import { cn } from "../../../lib/cn";
import { Kbd } from "./Kbd";

interface FooterNavProps {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const navBtnBase =
  "inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-[7px] text-[13px] font-medium disabled:cursor-default disabled:opacity-40";

export function FooterNav({ currentIndex, total, onPrev, onNext }: FooterNavProps) {
  return (
    <footer className="flex shrink-0 justify-between border-t border-gr-border bg-gr-chrome px-5 py-3">
      <button
        type="button"
        className={cn(
          navBtnBase,
          "border-gr-border bg-gr-bg text-gr-text",
          "[&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit"
        )}
        onClick={onPrev}
        disabled={currentIndex === 0}
      >
        Previous
        <Kbd>←</Kbd>
      </button>
      <button
        type="button"
        className={cn(
          navBtnBase,
          "border-gr-accent bg-gr-accent text-gr-accent-on",
          "[&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit"
        )}
        onClick={onNext}
        disabled={currentIndex >= total - 1}
      >
        Next
        <Kbd>→</Kbd>
      </button>
    </footer>
  );
}
