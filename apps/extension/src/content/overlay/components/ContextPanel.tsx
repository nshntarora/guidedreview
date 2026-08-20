import type { ReviewErrorInfo, ReviewUnit } from "@extension/lib/types";
import { getProvider, type ProviderId } from "@guided-review/core";
import { ConnectProviderPrompt } from "./ConnectProviderPrompt";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Button, Spinner } from "@guided-review/ui";
import { ShortcutKeys } from "./ShortcutKeys";
import {
  BUILD_PLAN_PRIMARY,
  missingMetadataHint,
  PR_DESCRIPTION_HINT,
  STRUCTURE_REVIEW_HINT,
} from "@extension/content/overlay/overlayCopy";
import { useReviewHost } from "../host";

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
  /** Local: start the opt-in annotation stream from the Change summary card. */
  onStructureReview?: () => void;
  /** Local: an AI plan is already in place for the current scope. */
  structured?: boolean;
  /** Local: selected coding agent / provider shown under Structure with AI. */
  structureWith?: { provider: ProviderId; label: string };
}

/** Quiet attribution under the CTA. OpenAI's mark is inverted on the dark pane. */
function StructureWithCaption({ provider, label }: { provider: ProviderId; label: string }) {
  const host = useReviewHost();
  const def = getProvider(provider);
  return (
    <p
      className="mt-2 mb-0 flex items-center gap-1.5 text-sm text-muted"
      data-testid="structure-review-provider"
    >
      <img
        src={host.assetUrl(def.iconSrc)}
        alt=""
        width={14}
        height={14}
        draggable={false}
        aria-hidden="true"
        className={`size-3.5 shrink-0 object-contain ${provider === "openai" ? "invert" : ""}`}
      />
      using {label}
    </p>
  );
}

/**
 * Right-pane copy for the active unit. Branch precedence:
 * needsProvider (no AI context yet) → error → summary chrome (description or
 * empty-context file units) → unit context.
 */
export function ContextPanel({
  unit,
  hasTitle = true,
  hasDescription = true,
  error,
  needsProvider,
  loading,
  loadingDetail,
  onRetry,
  onStructureReview,
  structured = false,
  structureWith,
}: ContextPanelProps) {
  const host = useReviewHost();
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

  // Change summary (null unit) and file-mode units (empty context) share the
  // same chrome: structure CTA when available, otherwise the summary hint,
  // plus keyboard shortcuts. AI units always have real commentary.
  if (!unit || !unit.context.trim()) {
    const hint =
      hasTitle && hasDescription && host.kind === "github"
        ? PR_DESCRIPTION_HINT
        : missingMetadataHint(hasTitle, hasDescription, host.kind);

    return (
      <div className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1">
        <div className="text-lg leading-[1.7] text-foreground" data-testid="context-panel-body">
          {onStructureReview && !structured ? STRUCTURE_REVIEW_HINT : hint}
        </div>
        {onStructureReview && !structured && !loading ? (
          <div className="mt-4">
            <Button
              size="sm"
              onClick={onStructureReview}
              data-testid="structure-review"
              aria-keyshortcuts="Meta+I Control+I"
            >
              Structure with AI
              <ShortcutKeys keys={["mod", "I"]} join="chord" />
            </Button>
            {structureWith ? (
              <StructureWithCaption provider={structureWith.provider} label={structureWith.label} />
            ) : null}
          </div>
        ) : null}
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
            showStructureReview={Boolean(onStructureReview && !structured)}
          />
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
