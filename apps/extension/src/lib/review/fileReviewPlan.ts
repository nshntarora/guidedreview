import type { ParsedDiff, ReviewPlan, ReviewUnit } from "../types";
import { roleForPath } from "./pathClass";

/**
 * Fallback plan for when no AI provider is configured: one review unit per
 * changed file, in diff order. The reviewer still gets the full walkthrough —
 * diff panes, line selection, draft comments, submit — just without the
 * AI-chosen ordering and per-step context.
 */
export function buildFileReviewPlan(diff: ParsedDiff): ReviewPlan {
  const units: ReviewUnit[] = diff.files.map((file, index) => {
    const role = roleForPath(file.path);
    return {
      id: `file-${index}-${file.path}`,
      title: file.path,
      kind: role === "test" ? "tests" : "change",
      // Deliberately empty: the context panel shows the connect-a-provider
      // prompt instead of inventing commentary we have no model to write.
      context: "",
      files: [{ fileId: file.path, hunkIds: [], role }],
    };
  });

  return { units };
}
