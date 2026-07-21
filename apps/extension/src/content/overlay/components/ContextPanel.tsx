import type { ReviewErrorInfo, ReviewUnit } from "../../../lib/types";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Spinner } from "@guided-review/ui";
import { missingMetadataHint, PR_DESCRIPTION_HINT } from "../missingMetadata";

export { missingMetadataHint, PR_DESCRIPTION_HINT } from "../missingMetadata";

interface ContextPanelProps {
  /** When null, the synthetic PR-description unit is active. */
  unit: ReviewUnit | null;
  /** Whether the PR has a non-empty title. Used when the description unit is active. */
  hasTitle?: boolean;
  /** Whether the PR has a non-empty description. Used when the description unit is active. */
  hasDescription?: boolean;
  error?: ReviewErrorInfo | null;
  loading?: boolean;
  /** Retry the failed API / review build step. */
  onRetry?: () => void;
}

export function ContextPanel({
  unit,
  hasTitle = true,
  hasDescription = true,
  error,
  loading,
  onRetry,
}: ContextPanelProps) {
  if (error) {
    return (
      <div
        className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1"
        role="alert"
        data-testid="context-panel-error"
      >
        <div className="mb-2 text-xs font-semibold tracking-[0.04em] text-gr-muted uppercase">
          Error
        </div>

        {(error.statusCode !== undefined || error.code) && (
          <dl className="mb-2 m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm leading-normal">
            {error.statusCode !== undefined && (
              <>
                <dt className="m-0 font-medium text-gr-muted">HTTP Status</dt>
                <dd className="m-0 font-mono text-gr-danger" data-testid="error-status-code">
                  {error.statusCode}
                </dd>
              </>
            )}
            {error.code && (
              <>
                <dt className="m-0 font-medium text-gr-muted">Error Code</dt>
                <dd className="m-0 font-mono break-all text-gr-danger" data-testid="error-code">
                  {error.code}
                </dd>
              </>
            )}
          </dl>
        )}

        <pre className="m-0 max-h-[40vh] overflow-x-auto overflow-y-auto rounded-md border border-gr-danger bg-gr-danger-subtle p-3 text-left font-mono text-sm leading-normal break-words whitespace-pre-wrap text-gr-danger">
          <code data-testid="error-message">{error.message}</code>
        </pre>

        {onRetry && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex cursor-pointer items-center rounded-md border border-gr-accent bg-gr-accent px-3 py-1.5 text-base font-medium text-gr-accent-on hover:border-gr-accent-hover hover:bg-gr-accent-hover"
            >
              Retry
            </button>
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
        <div className="text-lg leading-[1.7] text-gr-text" data-testid="context-panel-body">
          {hint}
        </div>
        {loading ? (
          <div className="mt-4 flex items-center gap-2.5 border-t border-gr-border-muted pt-3">
            <Spinner label="Building remaining units" />
            <p className="m-0 text-base text-gr-muted">Building remaining units…</p>
          </div>
        ) : (
          <KeyboardShortcuts />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1">
      <div className="text-base leading-[1.7] text-gr-text" data-testid="context-panel-body">
        {unit.context}
      </div>
    </div>
  );
}
