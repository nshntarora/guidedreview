import type { ReviewErrorInfo, ReviewUnit } from "@guided-review/ui/review/types";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Button, Spinner } from "@guided-review/ui";
import {
  BUILD_PLAN_PRIMARY,
  missingMetadataHint,
  PR_DESCRIPTION_HINT,
} from "@guided-review/ui/review/overlayCopy";
import { useReviewStore } from "@guided-review/ui/review/store";
import { useReviewHost } from "@guided-review/ui/review/host";
import type { DiffSummary } from "@guided-review/core";
import type { LocalCommitCard, LocalDiffScopeOption } from "@guided-review/ui/review/localReview";
import { LocalCommitList } from "./LocalCommitList";
import { SkeletonBar } from "./SkeletonBar";

interface ContextPanelProps {
  commits?: LocalCommitCard[];
  totalCommits?: number;
  uncommitted?: LocalDiffScopeOption;
  /** The selected AI unit, or null for summary and full-file selections. */
  unit: ReviewUnit | null;
  stats?: Pick<DiffSummary, "files" | "additions" | "deletions"> | null;
  isSummary?: boolean;
  /** Whether the PR has a non-empty title. Used when the description unit is active. */
  hasTitle?: boolean;
  /** Whether the PR has a non-empty description. Used when the description unit is active. */
  hasDescription?: boolean;
  error?: ReviewErrorInfo | null;
  loadingDiff?: boolean;
  loading?: boolean;
  /** Pipeline phase detail shown under the primary loading line. */
  loadingDetail?: string | null;
  /** Retry the failed API / review build step. */
  onRetry?: () => void;
}

function ContextError({ error, onRetry }: { error: ReviewErrorInfo; onRetry?: () => void }) {
  return (
    <div
      className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1"
      role="alert"
      data-testid="context-panel-error"
    >
      <div className="mb-2 text-xs font-semibold tracking-[0.04em] text-muted uppercase">Error</div>

      {(error.statusCode !== undefined || error.code) && (
        <dl className="mb-2 m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm leading-normal">
          {error.statusCode !== undefined && (
            <>
              <dt className="m-0 font-medium text-muted">HTTP Status</dt>
              <dd className="m-0 font-mono text-danger" data-testid="error-status-code">
                {error.statusCode}
              </dd>
            </>
          )}
          {error.code && (
            <>
              <dt className="m-0 font-medium text-muted">Error Code</dt>
              <dd className="m-0 font-mono break-all text-danger" data-testid="error-code">
                {error.code}
              </dd>
            </>
          )}
        </dl>
      )}

      <pre className="m-0 max-h-[40vh] overflow-x-auto overflow-y-auto rounded-md border border-danger bg-danger-muted p-3 text-left font-mono text-sm leading-normal break-words whitespace-pre-wrap text-danger">
        <code data-testid="error-message">{error.message}</code>
      </pre>

      {onRetry && (
        <div className="mt-3">
          <Button size="sm" onClick={onRetry} data-testid="context-panel-retry">
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

function SummaryUnitPanel({
  isSummary,
  hasTitle,
  hasDescription,
  loading,
  loadingDetail,
}: {
  isSummary: boolean;
  hasTitle: boolean;
  hasDescription: boolean;
  loading?: boolean;
  loadingDetail?: string | null;
}) {
  const host = useReviewHost();
  const hint =
    hasTitle && hasDescription && host.kind === "github"
      ? PR_DESCRIPTION_HINT
      : missingMetadataHint(hasTitle, hasDescription, host.kind);

  return (
    <div className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1">
      {(host.kind !== "local" || isSummary) && (
        <div className="text-lg leading-[1.7] text-foreground" data-testid="context-panel-body">
          {hint}
        </div>
      )}
      {host.kind === "github" && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          data-testid="context-pr-description"
          onClick={() => useReviewStore.getState().selectContent({ kind: "summary" })}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6M8 13h8M8 17h6" />
          </svg>
          View PR Description
        </Button>
      )}
      {loading ? (
        <div
          className="mt-4 flex items-center gap-2.5 border-t border-border-strong pt-3"
          data-testid="context-panel-loading"
        >
          <Spinner
            label={loadingDetail ? `${BUILD_PLAN_PRIMARY}. ${loadingDetail}` : BUILD_PLAN_PRIMARY}
          />
          <div className="min-w-0">
            <p className="m-0 text-base text-muted">{BUILD_PLAN_PRIMARY}</p>
            {loadingDetail ? (
              <p
                className="m-0 mt-0.5 text-sm text-muted"
                data-testid="context-panel-loading-detail"
              >
                {loadingDetail}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <KeyboardShortcuts
          allowExit={host.kind !== "local"}
          showSettings={host.kind === "local"}
          showScopePicker={host.kind === "local"}
        />
      )}
    </div>
  );
}

export function ContextPanel({
  commits,
  totalCommits,
  uncommitted,
  unit,
  stats,
  isSummary = true,
  hasTitle = true,
  hasDescription = true,
  error,
  loadingDiff = false,
  loading,
  loadingDetail,
  onRetry,
}: ContextPanelProps) {
  const host = useReviewHost();
  if (loadingDiff && !error) {
    return (
      <div
        aria-label="Loading review context"
        aria-busy="true"
        data-testid="context-panel-skeleton"
      >
        <div aria-hidden="true" className="space-y-3">
          <SkeletonBar className="w-5/6" />
          <SkeletonBar className="w-full" />
          <SkeletonBar className="w-2/3" />
          <div className="space-y-4 border-t border-border pt-5 mt-6">
            <SkeletonBar className="mb-5 w-1/2" />
            <SkeletonBar className="w-full" />
            <SkeletonBar className="w-4/5" />
            <SkeletonBar className="w-5/6" />
            <SkeletonBar className="w-2/3" />
          </div>
        </div>
      </div>
    );
  }
  const unitSummary = unit ? (
    <div>
      {unit.context.trim() && (
        <div className="text-base leading-[1.7] text-foreground" data-testid="context-panel-body">
          {unit.context}
        </div>
      )}
      {stats && (
        <div
          className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted"
          data-testid="review-unit-stats"
        >
          <span>
            {stats.files} {stats.files === 1 ? "file" : "files"} changed
          </span>
          <span className="font-medium text-diff-add" aria-label={`${stats.additions} lines added`}>
            +{stats.additions}
          </span>
          <span
            className="font-medium text-diff-del"
            aria-label={`${stats.deletions} lines deleted`}
          >
            −{stats.deletions}
          </span>
        </div>
      )}
    </div>
  ) : null;
  if (host.kind === "local") {
    return (
      <div className="flex flex-col gap-4">
        {error ? <ContextError error={error} onRetry={onRetry} /> : unitSummary}
        <LocalCommitList commits={commits} totalCommits={totalCommits} uncommitted={uncommitted} />
        <KeyboardShortcuts allowExit={false} showSettings showScopePicker />
      </div>
    );
  }
  if (error) {
    return <ContextError error={error} onRetry={onRetry} />;
  }

  // Summary and full-file selections share guidance and keyboard help.
  // Commentary belongs only to the selected AI unit.
  if (!unit) {
    return (
      <SummaryUnitPanel
        isSummary={isSummary}
        hasTitle={hasTitle}
        hasDescription={hasDescription}
        loading={loading}
        loadingDetail={loadingDetail}
      />
    );
  }

  return <div className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1">{unitSummary}</div>;
}
