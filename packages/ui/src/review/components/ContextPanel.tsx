import type { ReviewErrorInfo, ReviewUnit } from "@guided-review/ui/review/types";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Button, Spinner } from "@guided-review/ui";
import {
  BUILD_PLAN_PRIMARY,
  missingMetadataHint,
  PR_DESCRIPTION_HINT,
} from "@guided-review/ui/review/overlayCopy";
import { useReviewHost } from "@guided-review/ui/review/host";

interface ContextPanelProps {
  /** When null, the synthetic PR-description unit is active. */
  unit: ReviewUnit | null;
  /** Whether the PR has a non-empty title. Used when the description unit is active. */
  hasTitle?: boolean;
  /** Whether the PR has a non-empty description. Used when the description unit is active. */
  hasDescription?: boolean;
  error?: ReviewErrorInfo | null;
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
  hasTitle,
  hasDescription,
  loading,
  loadingDetail,
}: {
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
      <div className="text-lg leading-[1.7] text-foreground" data-testid="context-panel-body">
        {hint}
      </div>
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
  unit,
  hasTitle = true,
  hasDescription = true,
  error,
  loading,
  loadingDetail,
  onRetry,
}: ContextPanelProps) {
  if (error) {
    return <ContextError error={error} onRetry={onRetry} />;
  }

  // Summary and full-file selections share guidance and keyboard help.
  // Commentary belongs only to the selected AI unit.
  if (!unit || !unit.context.trim()) {
    return (
      <SummaryUnitPanel
        hasTitle={hasTitle}
        hasDescription={hasDescription}
        loading={loading}
        loadingDetail={loadingDetail}
      />
    );
  }

  return (
    <div className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1">
      <div className="text-base leading-[1.7] text-foreground" data-testid="context-panel-body">
        {unit.context}
      </div>
    </div>
  );
}
