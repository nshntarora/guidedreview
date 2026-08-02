import type { ReviewErrorInfo, ReviewUnit } from "@extension/lib/types";
import { ConnectProviderPrompt } from "./ConnectProviderPrompt";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Button, Spinner } from "@guided-review/ui";
import {
  BUILD_PLAN_PRIMARY,
  missingMetadataHint,
  PR_DESCRIPTION_HINT,
} from "@extension/content/overlay/overlayCopy";

interface ContextPanelProps {
  /** When null, the synthetic PR-description unit is active. */
  unit: ReviewUnit | null;
  /** Whether the PR has a non-empty title. Used when the description unit is active. */
  hasTitle?: boolean;
  /** Whether the PR has a non-empty description. Used when the description unit is active. */
  hasDescription?: boolean;
  error?: ReviewErrorInfo | null;
  /** No AI provider configured — prompt to connect one instead of erroring. */
  needsProvider?: boolean;
  loading?: boolean;
  /** Pipeline phase detail shown under the primary loading line. */
  loadingDetail?: string | null;
  /** Retry the failed API / review build step. */
  onRetry?: () => void;
}

export function ContextPanel({
  unit,
  hasTitle = true,
  hasDescription = true,
  error,
  needsProvider,
  loading,
  loadingDetail,
  onRetry,
}: ContextPanelProps) {
  // Takes precedence over `error`: a missing key is a setup step, not a failure.
  // Units built locally have no context to show; a restored AI unit still does,
  // so never cover real commentary with the prompt.
  if (needsProvider && !unit?.context.trim()) {
    return <ConnectProviderPrompt />;
  }

  if (error) {
    return (
      <div
        className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1"
        role="alert"
        data-testid="context-panel-error"
      >
        <div className="mb-2 text-xs font-semibold tracking-[0.04em] text-muted uppercase">
          Error
        </div>

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
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!unit) {
    const hint =
      hasTitle && hasDescription
        ? PR_DESCRIPTION_HINT
        : missingMetadataHint(hasTitle, hasDescription);

    return (
      <div className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1">
        <div className="text-lg leading-[1.7] text-foreground" data-testid="context-panel-body">
          {hint}
        </div>
        {loading ? (
          <div
            className="mt-4 flex items-start gap-2.5 border-t border-border-strong pt-3"
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
          <KeyboardShortcuts />
        )}
      </div>
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
