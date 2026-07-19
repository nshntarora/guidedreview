import type { ParsedDiff, PRContext } from "../../../lib/types";
import { summarizeDiff } from "../../../lib/github/diffSummary";
import { Kbd } from "./Kbd";

interface ProgressHeaderProps {
  currentIndex: number;
  total: number;
  /** When false, only show "Step N" without a known total (plan still loading). */
  totalKnown: boolean;
  prContext: PRContext | null;
  diff: ParsedDiff | null;
  onExit: () => void;
}

export function ProgressHeader({
  currentIndex,
  total,
  totalKnown,
  prContext,
  diff,
  onExit,
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
          {totalKnown && total > 0 ? (
            <span className="text-[13px] text-gr-muted">
              Step {currentIndex + 1} of {total}
            </span>
          ) : (
            <span className="text-[13px] text-gr-muted">Step {currentIndex + 1}</span>
          )}
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
