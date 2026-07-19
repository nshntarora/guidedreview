/** Default right-pane copy when the PR has both a title and a description. */
export const PR_DESCRIPTION_HINT =
  "Read the author's intent before walking the code. This is always the first step of a guided review.";

/**
 * User-facing copy when the PR is missing a title and/or description.
 * Shared by the left description pane and the right context panel so wording
 * stays consistent.
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

/** Left-pane empty-state copy when there is no description body to render. */
export function emptyDescriptionCopy(hasTitle: boolean): string {
  if (!hasTitle) {
    return "The author hasn't added a PR title or description. The AI will infer what this PR is about from the diff.";
  }
  return "The author hasn't added a PR description. The AI will infer what this PR is about from the diff.";
}
