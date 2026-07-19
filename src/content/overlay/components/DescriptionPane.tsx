import type { FileChangeStatus, ParsedDiff, PRContext } from "../../../lib/types";
import { summarizeDiff, type FileDiffSummary } from "../../../lib/github/diffSummary";

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
    <div className={`gr-description-pane${summary ? " gr-description-pane--with-summary" : ""}`}>
      <div className="gr-description-pane-main">
        <h2 className="gr-description-pane-title">PR description</h2>
        {descriptionHtml ? (
          <div
            className="gr-description-pane-body markdown-body"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : description ? (
          <div className="gr-description-pane-body">{description}</div>
        ) : (
          <p className="gr-description-pane-empty">
            {emptyDescriptionCopy(hasTitle)}
          </p>
        )}
      </div>

      {summary && (
        <section className="gr-diff-summary" aria-label="Diff summary">
          <h3 className="gr-diff-summary-title">Changes</h3>
          <p className="gr-diff-summary-totals">
            <span className="gr-stat-add">+{summary.additions}</span>
            <span className="gr-stat-del">−{summary.deletions}</span>
            <span className="gr-diff-summary-file-count">
              · {summary.files} file{summary.files === 1 ? "" : "s"}
            </span>
          </p>
          <ul className="gr-diff-summary-files">
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
    <li className={`gr-diff-summary-file gr-diff-summary-file--${file.status}`}>
      <span
        className={`gr-diff-summary-status gr-diff-summary-status--${file.status}`}
        title={badge.label}
        aria-label={badge.label}
      >
        {badge.letter}
      </span>
      <span className="gr-diff-summary-path" title={pathLabel}>
        {pathLabel}
      </span>
      <span className="gr-diff-summary-counts">
        {file.isBinaryOrElided ? (
          <span className="gr-diff-summary-binary">binary</span>
        ) : (
          <>
            {file.additions > 0 && (
              <span className="gr-stat-add">+{file.additions}</span>
            )}
            {file.deletions > 0 && (
              <span className="gr-stat-del">−{file.deletions}</span>
            )}
            {file.additions === 0 && file.deletions === 0 && (
              <span className="gr-diff-summary-unchanged">0</span>
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
