import type { ParsedDiff, ReviewPlan, ReviewUnit } from "../types";
import { DEFAULT_FILE_ROLE } from "../types";

/**
 * Fallback plan for when no AI provider is configured: one review unit per
 * changed file, in diff order. The reviewer still gets the full walkthrough —
 * diff panes, line selection, draft comments, submit — just without the
 * AI-chosen ordering and per-step context.
 *
 * Roles are not inferred here. Role only drives AI-ordered grouping, and
 * guessing it from the path would be a second, weaker classifier competing
 * with the model's.
 */
export function buildFileReviewPlan(diff: ParsedDiff): ReviewPlan {
  const units: ReviewUnit[] = diff.files.map((file, index) => ({
    id: `file-${index}-${file.path}`,
    title: file.path,
    // Deliberately empty: the context panel shows the connect-a-provider
    // prompt instead of inventing commentary we have no model to write.
    context: "",
    files: [{ fileId: file.path, hunkIds: [], role: DEFAULT_FILE_ROLE }],
  }));

  return { units };
}
