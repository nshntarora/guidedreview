import type { ParsedDiff, PRContext } from "../../../lib/types";
import { summarizeDiff } from "../../../lib/github/diffSummary";
import { Kbd } from "./Kbd";

interface ProgressHeaderProps {
  prContext: PRContext | null;
  diff: ParsedDiff | null;
  onExit: () => void;
  /** Opens the Submit review modal. */
  onSubmitReview: () => void;
}

export function ProgressHeader({
  prContext,
  diff,
  onExit,
  onSubmitReview,
}: ProgressHeaderProps) {
  const stats = diff ? summarizeDiff(diff) : null;
  const logomarkUrl = chrome.runtime.getURL("logomark.svg");

  return (
    <header className="flex shrink-0 flex-col gap-1.5 border-b border-gr-border bg-gr-chrome px-5 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <img
            className="block h-4 w-8 shrink-0"
            src={logomarkUrl}
            alt=""
            width={32}
            height={16}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[15px] font-semibold">
                {prContext?.title || "Guided Review"}
              </span>
              {prContext && (
                <span className="shrink-0 text-[13px] text-gr-muted">#{prContext.number}</span>
              )}
            </div>
            {prContext && (prContext.author || prContext.baseRef || prContext.headRef || stats) && (
              <div className="flex items-center gap-2.5 text-[12.5px] text-gr-muted">
                {prContext.author && <span>@{prContext.author}</span>}
                {(prContext.baseRef || prContext.headRef) && (
                  <span className="inline-block rounded-full border border-gr-border bg-gr-bg px-2.5 py-px font-mono text-xs text-gr-text">
                    {prContext.baseRef || "?"} ← {prContext.headRef || "?"}
                  </span>
                )}
                {stats && (
                  <span>
                    {stats.files} file{stats.files === 1 ? "" : "s"} changed
                    <span className="ml-1 text-gr-add-text"> +{stats.additions}</span>
                    <span className="ml-1 text-gr-del-text"> −{stats.deletions}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gr-accent bg-gr-accent px-3 py-1.5 text-[13px] font-medium text-gr-accent-on hover:border-gr-accent-hover hover:bg-gr-accent-hover [&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit"
            onClick={onSubmitReview}
            data-testid="submit-review-button"
          >
            Submit review
            <Kbd>⌘</Kbd>
            <span className="text-[11px] opacity-70">/</span>
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
          </button>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gr-border bg-gr-bg px-3 py-1.5 text-[13px] text-gr-text hover:bg-gr-subtle"
            onClick={onExit}
          >
            Exit
            <Kbd>Esc</Kbd>
          </button>
        </div>
      </div>
    </header>
  );
}
