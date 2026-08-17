import type { BuildPhase } from "./store";

/** Primary loading line while the review plan is being built. */
export const BUILD_PLAN_PRIMARY = "Building a review plan";

/** Default right-pane copy when the PR has both a title and a description. */
export const PR_DESCRIPTION_HINT =
  "Author's summary of intent. Start here, then step through the planned units.";

/** Right-pane copy on the local Change summary before an AI plan is requested. */
export const STRUCTURE_REVIEW_HINT =
  "One unit per file until you structure it. AI groups files and adds context — it does not review for you.";

/** Subtext for the active pipeline phase. */
export function buildPhaseDetail(phase: BuildPhase, providerLabel: string | null): string {
  switch (phase) {
    case "extracting_diff":
      return "Extracting the diff…";
    case "processing_diff":
      return "Processing the diff…";
    case "sent_to_provider":
      return `Sent it to ${providerLabel ?? "your AI provider"}…`;
    case "waiting_for_tokens":
      return "Waiting for tokens…";
    case "tokens_streaming":
      return "Tokens are streaming…";
  }
}

/**
 * User-facing copy when the PR is missing a title and/or description.
 * Shared by the left description pane and the right context panel so wording
 * stays consistent.
 */
export function missingMetadataHint(
  hasTitle: boolean,
  hasDescription: boolean,
  kind: "github" | "local" = "github",
): string {
  if (kind === "local") {
    if (!hasTitle && !hasDescription) {
      return "No branch summary. Intent will be inferred from the diff.";
    }
    if (!hasDescription) {
      return "No commits on this branch. Intent will be inferred from the branch name and diff.";
    }
    if (!hasTitle) {
      return "No branch name. Intent will be inferred from the commits and diff.";
    }
    return "Commits on this branch. Start here, then step through the files.";
  }
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
