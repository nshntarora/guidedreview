import type { FileChangeStatus, ParsedDiff } from "@extension/lib/types";
import type { ReviewContext } from "@guided-review/core";
import { summarizeDiff, type FileDiffSummary } from "@guided-review/core";
import { cn } from "@guided-review/ui";
import { missingMetadataHint } from "@extension/content/overlay/overlayCopy";
import { summaryUnitTitle } from "@extension/content/overlay/store";
import { useReviewHost } from "@extension/content/overlay/host";
import {
  MAX_RECENT_COMMITS,
  type LocalCommitCard,
  type LocalDiffScopeOption,
} from "@extension/content/overlay/localReview";
import { DiffStatCounts } from "./DiffStatCounts";
import { MiddleEllipsisText } from "./MiddleEllipsisText";

interface DescriptionPaneProps {
  prContext: ReviewContext | null;
  diff: ParsedDiff | null;
  commits?: LocalCommitCard[];
  /** Non-empty uncommitted scope, shown as a card above recent commits. */
  uncommitted?: LocalDiffScopeOption;
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
export function DescriptionPane({ prContext, diff, commits, uncommitted }: DescriptionPaneProps) {
  const host = useReviewHost();
  const description = prContext?.description ?? "";
  const descriptionHtml = prContext?.descriptionHtml ?? "";
  const hasTitle = hasNonEmpty(prContext?.title);
  const summary = diff && diff.files.length > 0 ? summarizeDiff(diff) : null;
  const recentCommits = commits?.slice(0, MAX_RECENT_COMMITS) ?? [];
  const showUncommitted = Boolean(uncommitted && !uncommitted.empty);
  const showCommitCards = host.kind === "local" && (recentCommits.length > 0 || showUncommitted);

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
          {summaryUnitTitle(host.kind)}
        </h2>
        {showCommitCards ? (
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0" data-testid="commit-list">
            {showUncommitted && uncommitted && <UncommittedCard scope={uncommitted} />}
            {recentCommits.map((commit) => (
              <CommitCard key={commit.sha} commit={commit} />
            ))}
          </ol>
        ) : descriptionHtml ? (
          <div
            className="markdown-body text-[0.9375rem] leading-[1.7] break-words text-foreground"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : description && host.kind !== "local" ? (
          <div className="text-[0.9375rem] leading-[1.7] break-words whitespace-pre-wrap text-foreground">
            {description}
          </div>
        ) : (
          <p
            className="m-0 text-[0.9375rem] leading-relaxed text-muted"
            data-testid="description-pane-empty"
          >
            {missingMetadataHint(hasTitle, false, host.kind)}
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

function formatCommitDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function UncommittedCard({ scope }: { scope: LocalDiffScopeOption }) {
  return (
    <li
      className="rounded-lg border border-border bg-background px-3.5 py-3"
      data-testid="uncommitted-card"
    >
      <h3 className="m-0 text-[0.9375rem] font-semibold leading-snug text-foreground">
        {scope.label}
      </h3>
      {scope.stat && scope.stat.files > 0 ? (
        <p className="m-0 mt-1 text-sm">
          <DiffStatCounts {...scope.stat} />
        </p>
      ) : scope.meta ? (
        <p className="m-0 mt-1 text-sm text-muted">{scope.meta}</p>
      ) : null}
      {scope.description ? (
        <p className="m-0 mt-2 text-sm leading-relaxed text-foreground">{scope.description}</p>
      ) : null}
    </li>
  );
}

function CommitCard({ commit }: { commit: LocalCommitCard }) {
  return (
    <li
      className="rounded-lg border border-border bg-background px-3.5 py-3"
      data-testid="commit-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-[0.9375rem] font-semibold leading-snug text-foreground">
          {commit.subject}
        </h3>
        <span className="shrink-0 font-mono text-xs text-muted">{commit.shortSha}</span>
      </div>
      <p className="m-0 mt-1 flex items-baseline justify-between gap-3 text-sm text-muted">
        <span>
          {[commit.author, formatCommitDate(commit.authoredAt)].filter(Boolean).join(" · ")}
        </span>
        {commit.stat && commit.stat.files > 0 ? (
          <DiffStatCounts
            additions={commit.stat.additions}
            deletions={commit.stat.deletions}
            className="shrink-0"
          />
        ) : null}
      </p>
      {commit.body ? (
        <p className="m-0 mt-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {commit.body}
        </p>
      ) : null}
    </li>
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
