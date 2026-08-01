/** Default right-pane copy when the PR has both a title and a description. */
export const PR_DESCRIPTION_HINT =
  "Author's summary of intent. Start here, then step through the planned units.";

/**
 * User-facing copy when the PR is missing a title and/or description.
 * Shared by the left description pane and the right context panel so wording
 * stays consistent.
 */
export function missingMetadataHint(hasTitle: boolean, hasDescription: boolean): string {
  if (!hasTitle && !hasDescription) {
    return "No PR title or description. Intent will be inferred from the diff.";
  }
  if (!hasDescription) {
    return "No PR description. Intent will be inferred from the title and diff.";
  }
  if (!hasTitle) {
    return "No PR title. Intent will be inferred from the description and diff.";
  }
  return PR_DESCRIPTION_HINT;
}
