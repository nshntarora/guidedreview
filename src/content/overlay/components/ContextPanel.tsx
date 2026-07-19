import type { ReviewUnit } from "../../../lib/types";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Spinner } from "./Spinner";
import { missingMetadataHint, PR_DESCRIPTION_HINT } from "../missingMetadata";

export { missingMetadataHint, PR_DESCRIPTION_HINT } from "../missingMetadata";

interface ContextPanelProps {
  /** When null, the synthetic PR-description unit is active. */
  unit: ReviewUnit | null;
  /** Whether the PR has a non-empty title. Used when the description unit is active. */
  hasTitle?: boolean;
  /** Whether the PR has a non-empty description. Used when the description unit is active. */
  hasDescription?: boolean;
  error?: string | null;
  loading?: boolean;
}

export function ContextPanel({
  unit,
  hasTitle = true,
  hasDescription = true,
  error,
  loading,
}: ContextPanelProps) {
  if (error) {
    return (
      <div className="rounded-none border-0 bg-transparent px-0 py-0.5 pb-1">
        <div className="mb-2 text-xs font-semibold tracking-[0.04em] text-gr-muted uppercase">
          Something went wrong
        </div>
        <pre className="m-0 max-h-[40vh] overflow-x-auto overflow-y-auto rounded-md border border-gr-danger bg-gr-danger-subtle p-3 text-left font-mono text-[12.5px] leading-normal break-words whitespace-pre-wrap text-gr-danger">
          <code>{error}</code>
        </pre>
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
        <div className="text-base leading-[1.7] text-gr-text" data-testid="context-panel-body">
          {hint}
        </div>
        {loading ? (
          <div className="mt-4 flex items-center gap-2.5 border-t border-gr-border-muted pt-3">
            <Spinner label="Building the rest of the walkthrough" />
            <p className="m-0 text-[13px] text-gr-muted">Building the rest of the walkthrough…</p>
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
