import type { PRContext } from "../../../lib/types";

interface DescriptionPaneProps {
  prContext: PRContext | null;
}

/**
 * Left-pane view for the synthetic "PR description" review unit. Renders the
 * GitHub markdown HTML when available, plain text as a fallback, or an empty
 * state when the PR has no description.
 */
export function DescriptionPane({ prContext }: DescriptionPaneProps) {
  const description = prContext?.description ?? "";
  const descriptionHtml = prContext?.descriptionHtml ?? "";

  return (
    <div className="gr-description-pane">
      <h2 className="gr-description-pane-title">PR description</h2>
      {descriptionHtml ? (
        <div
          className="gr-description-pane-body markdown-body"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : description ? (
        <div className="gr-description-pane-body">{description}</div>
      ) : (
        <p className="gr-description-pane-empty">No description on this PR.</p>
      )}
    </div>
  );
}
