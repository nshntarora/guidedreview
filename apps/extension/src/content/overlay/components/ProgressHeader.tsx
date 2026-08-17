import type { ParsedDiff } from "@extension/lib/types";
import type { ReviewContext } from "@guided-review/core";
import { summarizeDiff } from "@guided-review/core";
import { Kbd } from "@guided-review/ui";
import { useReviewHost } from "../host";
import { ModEnterChord } from "./ShortcutKeys";

interface ProgressHeaderProps {
  prContext: ReviewContext | null;
  diff: ParsedDiff | null;
  /** Id for the dialog title (overlay aria-labelledby). */
  titleId: string;
  /** Accessible / visible title text. */
  title: string;
  onExit: () => void;
  /** Opens the Submit Review modal or copies local notes. */
  onSubmitReview: () => void;
  /** When set, the primary action is copy-notes (no GitHub submit). */
  notesCount?: number;
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
  notesCount,
}: ProgressHeaderProps) {
  const host = useReviewHost();
  const stats = diff ? summarizeDiff(diff) : null;
  const logomarkUrl = host.assetUrl("logomark.svg");
  const showPrNumber = host.kind === "github" && prContext?.number != null;
  const primaryIsExport = !host.submit && Boolean(host.exportNotes);
  const primaryDisabled = primaryIsExport && (notesCount ?? 0) === 0;

  return (
    <header className="flex shrink-0 flex-col gap-1.5 border-b border-border bg-background px-5 py-3.5">
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
              {showPrNumber && (
                <span className="shrink-0 text-base text-muted">#{prContext!.number}</span>
              )}
            </div>
            {prContext && (prContext.author || prContext.baseRef || prContext.headRef || stats) && (
              <div className="flex items-center gap-2.5 text-sm text-muted">
                {prContext.author && <span>@{prContext.author}</span>}
                {(prContext.baseRef || prContext.headRef) && (
                  <span className="inline-block rounded-full border border-border bg-surface px-2.5 py-px font-mono text-xs text-foreground">
                    {prContext.baseRef || "?"} ← {prContext.headRef || "?"}
                  </span>
                )}
                {stats && (
                  <span>
                    {stats.files} file{stats.files === 1 ? "" : "s"} changed
                    <span className="ml-1 text-diff-add"> +{stats.additions}</span>
                    <span className="ml-1 text-diff-del"> −{stats.deletions}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className={`${headerBtn} border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 [&_[data-slot=kbd]]:bg-[rgba(13,8,6,0.12)] [&_[data-slot=kbd]]:text-inherit`}
            onClick={onSubmitReview}
            disabled={primaryDisabled}
            data-testid="submit-review-button"
          >
            {primaryIsExport ? "Copy notes" : "Submit Review"}
            <ModEnterChord />
          </button>
          <button
            type="button"
            className={`${headerBtn} gap-2 border-border bg-surface text-foreground hover:bg-surface-muted`}
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
