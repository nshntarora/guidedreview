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
      <div className="gr-context-panel">
        <div className="gr-context-panel-label">Something went wrong</div>
        <pre className="gr-error-block">
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
      <div className="gr-context-panel">
        <div className="gr-context-panel-body">{hint}</div>
        {loading ? (
          <div className="gr-context-panel-loading">
            <Spinner label="Building the rest of the walkthrough" />
            <p className="gr-context-panel-loading-text">
              Building the rest of the walkthrough…
            </p>
          </div>
        ) : (
          <KeyboardShortcuts />
        )}
      </div>
    );
  }

  return (
    <div className="gr-context-panel">
      <div className="gr-context-panel-body">{unit.context}</div>
    </div>
  );
}
