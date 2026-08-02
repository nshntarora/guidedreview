import type { FileChangeStatus, ParsedDiff, PRContext } from "@extension/lib/types";
import { summarizeDiff, type FileDiffSummary } from "@extension/lib/github/diffSummary";
import { cn } from "@guided-review/ui";
import { missingMetadataHint } from "@extension/content/overlay/overlayCopy";
import { MiddleEllipsisText } from "./MiddleEllipsisText";

interface DescriptionPaneProps {
  prContext: PRContext | null;
  diff: ParsedDiff | null;
}

function hasNonEmpty(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

const STATUS_BADGE: Record<FileChangeStatus, { letter: string; label: string }> = {
  added: { letter: "A", label: "added" },
  modified: { letter: "M", label: "modified" },
  removed: { letter: "D", label: "deleted" },
  renamed: { letter: "R", label: "renamed" },
};

const STATUS_BADGE_CLASS: Record<FileChangeStatus, string> = {
  added: "bg-diff-add-bg text-diff-add",
  modified: "bg-surface-muted text-muted",
  removed: "bg-diff-del-bg text-diff-del",
  renamed: "bg-surface-muted text-syntax-entity",
};

/**
 * Left-pane view for the synthetic "PR description" review unit. Renders the
 * GitHub markdown HTML when available, plain text as a fallback, or an empty
 * state when the PR has no description (and notes a missing title too).
 * When a parsed diff is available, also shows a summary of file changes.
 */
export function DescriptionPane({ prContext, diff }: DescriptionPaneProps) {
  const description = prContext?.description ?? "";
  const descriptionHtml = prContext?.descriptionHtml ?? "";
  const hasTitle = hasNonEmpty(prContext?.title);
  const summary = diff && diff.files.length > 0 ? summarizeDiff(diff) : null;

  return (
    <div
      className={cn(
        "w-full max-w-full",
        // Keep Changes to the right of the description; shrink the description
        // before wrapping so the side-by-side layout holds in typical pane widths.
        summary && "flex flex-nowrap items-start justify-start gap-x-8",
      )}
      data-testid="description-pane"
    >
      <div className="min-w-0 max-w-[720px] flex-1">
        <h2 className="mb-5 text-[1.375rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
          PR Description
        </h2>
        {descriptionHtml ? (
          <div
            className="markdown-body text-[0.9375rem] leading-[1.7] break-words text-foreground"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : description ? (
          <div className="text-[0.9375rem] leading-[1.7] break-words whitespace-pre-wrap text-foreground">
            {description}
          </div>
        ) : (
          <p
            className="m-0 text-[0.9375rem] leading-relaxed text-muted"
            data-testid="description-pane-empty"
          >
            {missingMetadataHint(hasTitle, false)}
          </p>
        )}
      </div>

      {summary && (
        <section
          className="w-[min(100%,360px)] shrink-0 max-w-[400px] border-l border-border pl-6"
          aria-label="Diff summary"
        >
          <h3 className="mb-2.5 text-lg font-semibold text-foreground">Changes</h3>
          <p className="mb-3.5 text-[0.9375rem] text-muted tabular-nums">
            <span className="mr-2 font-semibold text-diff-add">+{summary.additions}</span>
            <span className="mr-2 font-semibold text-diff-del">−{summary.deletions}</span>
            <span>
              · {summary.files} file{summary.files === 1 ? "" : "s"}
            </span>
          </p>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {summary.fileSummaries.map((file) => (
              <DiffSummaryFileRow key={fileKey(file)} file={file} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DiffSummaryFileRow({ file }: { file: FileDiffSummary }) {
  const badge = STATUS_BADGE[file.status];
  const pathLabel =
    file.status === "renamed" && file.previousPath
      ? `${file.previousPath} → ${file.path}`
      : file.path;

  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[0.8125rem]">
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold leading-none",
          STATUS_BADGE_CLASS[file.status],
        )}
        title={badge.label}
        aria-label={badge.label}
      >
        {badge.letter}
      </span>
      <MiddleEllipsisText text={pathLabel} maxWidth="100%" className="min-w-0 text-foreground" />
      <span className="inline-flex min-w-[4.5rem] shrink-0 items-center justify-end gap-1.5 text-right tabular-nums">
        {file.isBinaryOrElided ? (
          <span className="text-[0.8125rem] text-faint">binary</span>
        ) : (
          <>
            {file.additions > 0 && (
              <span className="font-medium text-diff-add">+{file.additions}</span>
            )}
            {file.deletions > 0 && (
              <span className="font-medium text-diff-del">−{file.deletions}</span>
            )}
            {file.additions === 0 && file.deletions === 0 && (
              <span className="text-[0.8125rem] text-faint">0</span>
            )}
          </>
        )}
      </span>
    </li>
  );
}

function fileKey(file: FileDiffSummary): string {
  return file.previousPath ? `${file.previousPath}→${file.path}` : file.path;
}
