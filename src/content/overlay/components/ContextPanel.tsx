import type { ReviewUnit } from "../../../lib/types";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Spinner } from "./Spinner";

const PR_DESCRIPTION_HINT =
  "Read the author's intent before walking the code. This is always the first step of a guided review.";

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

/**
 * Right-pane copy for the synthetic PR-description unit when the author left
 * title and/or description blank — the AI has to infer intent from the diff.
 */
export function missingMetadataHint(hasTitle: boolean, hasDescription: boolean): string {
  if (!hasTitle && !hasDescription) {
    return "The author hasn't added a PR title or description. We'll rely on the AI to tell us what this PR is about from the diff.";
  }
  if (!hasDescription) {
    return "The author hasn't added a PR description. We'll rely on the AI to tell us what this PR is about from the diff.";
  }
  if (!hasTitle) {
    return "The author hasn't added a PR title. We'll rely on the AI to fill in the intent from the description and the diff.";
  }
  return PR_DESCRIPTION_HINT;
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
