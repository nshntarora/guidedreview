import type { ParsedDiff, PRContext } from "../../../lib/types";
import { summarizeDiff } from "../../../lib/github/diffSummary";
import { Kbd } from "@guided-review/ui";
import { ModEnterChord } from "./ShortcutKeys";

interface ProgressHeaderProps {
  prContext: PRContext | null;
  diff: ParsedDiff | null;
  /** Id for the dialog title (overlay aria-labelledby). */
  titleId: string;
  /** Accessible / visible title text. */
  title: string;
  onExit: () => void;
  /** Opens the Submit Review modal. */
  onSubmitReview: () => void;
}

const headerBtn =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-base font-medium";

export function ProgressHeader({
  prContext,
  diff,
  titleId,
  title,
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
              <h1 id={titleId} className="m-0 truncate text-lg font-semibold leading-snug">
                {title}
              </h1>
              {prContext && (
                <span className="shrink-0 text-base text-gr-muted">#{prContext.number}</span>
              )}
            </div>
            {prContext && (prContext.author || prContext.baseRef || prContext.headRef || stats) && (
              <div className="flex items-center gap-2.5 text-sm text-gr-muted">
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
            className={`${headerBtn} border-gr-accent bg-gr-accent text-gr-accent-on hover:border-gr-accent-hover hover:bg-gr-accent-hover [&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit`}
            onClick={onSubmitReview}
            data-testid="submit-review-button"
          >
            Submit Review
            <ModEnterChord />
          </button>
          <button
            type="button"
            className={`${headerBtn} gap-2 border-gr-border bg-gr-bg text-gr-text hover:bg-gr-subtle`}
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
