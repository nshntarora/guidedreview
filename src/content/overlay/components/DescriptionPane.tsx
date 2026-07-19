import type { FileChangeStatus, ParsedDiff, PRContext } from "../../../lib/types";
import { summarizeDiff, type FileDiffSummary } from "../../../lib/github/diffSummary";
import { cn } from "../../../lib/cn";

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
  added: "bg-gr-add-bg text-gr-add-text",
  modified: "bg-gr-subtle text-gr-muted",
  removed: "bg-gr-del-bg text-gr-del-text",
  renamed: "bg-gr-subtle text-gr-syntax-entity",
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
        summary && "flex flex-wrap items-start justify-start gap-x-8 gap-y-7"
      )}
      data-testid="description-pane"
    >
      <div className="min-w-0 max-w-[720px] flex-[0_1_720px]">
        <h2 className="mb-4 text-lg font-semibold text-gr-text">PR description</h2>
        {descriptionHtml ? (
          <div
            className="markdown-body text-base leading-[1.65] break-words text-gr-text"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : description ? (
          <div className="text-base leading-[1.65] break-words whitespace-pre-wrap text-gr-text">
            {description}
          </div>
        ) : (
          <p
            className="m-0 text-base leading-relaxed text-gr-muted"
            data-testid="description-pane-empty"
          >
            {emptyDescriptionCopy(hasTitle)}
          </p>
        )}
      </div>

      {summary && (
        <section
          className="ml-0 w-full min-w-[min(100%,260px)] max-w-[400px] flex-[0_1_360px] rounded-none border-0 border-l border-gr-border bg-transparent py-0 pr-0 pl-6"
          aria-label="Diff summary"
        >
          <h3 className="mb-2.5 text-lg font-semibold text-gr-text">Changes</h3>
          <p className="mb-3.5 text-[0.9375rem] text-gr-muted tabular-nums">
            <span className="mr-2 font-semibold text-gr-add-text">+{summary.additions}</span>
            <span className="mr-2 font-semibold text-gr-del-text">−{summary.deletions}</span>
            <span>
              · {summary.files} file{summary.files === 1 ? "" : "s"}
            </span>
          </p>
          <ul className="m-0 flex max-h-[min(60vh,520px)] list-none flex-col gap-0.5 overflow-y-auto p-0">
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
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[0.8125rem] hover:bg-gr-subtle">
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold leading-none",
          STATUS_BADGE_CLASS[file.status]
        )}
        title={badge.label}
        aria-label={badge.label}
      >
        {badge.letter}
      </span>
      <span className="min-w-0 truncate text-gr-text" title={pathLabel}>
        {pathLabel}
      </span>
      <span className="inline-flex min-w-[4.5rem] shrink-0 items-center justify-end gap-1.5 text-right tabular-nums">
        {file.isBinaryOrElided ? (
          <span className="text-[0.8125rem] text-gr-faint">binary</span>
        ) : (
          <>
            {file.additions > 0 && (
              <span className="font-medium text-gr-add-text">+{file.additions}</span>
            )}
            {file.deletions > 0 && (
              <span className="font-medium text-gr-del-text">−{file.deletions}</span>
            )}
            {file.additions === 0 && file.deletions === 0 && (
              <span className="text-[0.8125rem] text-gr-faint">0</span>
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

function emptyDescriptionCopy(hasTitle: boolean): string {
  if (!hasTitle) {
    return "The author hasn't added a PR title or description. The AI will infer what this PR is about from the diff.";
  }
  return "The author hasn't added a PR description. The AI will infer what this PR is about from the diff.";
}
