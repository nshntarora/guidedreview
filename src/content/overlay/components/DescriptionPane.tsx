import type { PRContext } from "../../../lib/types";

interface DescriptionPaneProps {
  prContext: PRContext | null;
}

function hasNonEmpty(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

/**
 * Left-pane view for the synthetic "PR description" review unit. Renders the
 * GitHub markdown HTML when available, plain text as a fallback, or an empty
 * state when the PR has no description (and notes a missing title too).
 */
export function DescriptionPane({ prContext }: DescriptionPaneProps) {
  const description = prContext?.description ?? "";
  const descriptionHtml = prContext?.descriptionHtml ?? "";
  const hasTitle = hasNonEmpty(prContext?.title);

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
        <p className="gr-description-pane-empty">
          {emptyDescriptionCopy(hasTitle)}
        </p>
      )}
    </div>
  );
}

function emptyDescriptionCopy(hasTitle: boolean): string {
  if (!hasTitle) {
    return "The author hasn't added a PR title or description. The AI will infer what this PR is about from the diff.";
  }
  return "The author hasn't added a PR description. The AI will infer what this PR is about from the diff.";
}
