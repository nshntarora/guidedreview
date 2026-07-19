import type { ReviewUnit } from "../../../lib/types";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Spinner } from "./Spinner";

const PR_DESCRIPTION_HINT =
  "Read the author's intent before walking the code. This is always the first step of a guided review.";

interface ContextPanelProps {
  /** When null, the synthetic PR-description unit is active. */
  unit: ReviewUnit | null;
  error?: string | null;
  loading?: boolean;
}

export function ContextPanel({ unit, error, loading }: ContextPanelProps) {
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
    return (
      <div className="gr-context-panel">
        <div className="gr-context-panel-body">{PR_DESCRIPTION_HINT}</div>
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
