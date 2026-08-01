import { middleTruncate } from "../middleTruncate";
import type { ParsedDiff, ReviewPlan, ReviewUnit } from "../types";
import { roleForPath } from "./pathClass";

/**
 * Character budget for path titles in the no-AI one-unit-per-file plan.
 * Matches the sidebar-width budget used when paths were truncated at render.
 * Full path stays on `title` for tooltips; truncated form is `displayTitle`.
 */
export const FILE_UNIT_TITLE_MAX = 40;

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
      // Full path — tooltips, identity. Truncated label is displayTitle.
      title: file.path,
      // Pre-truncated so the overlay can render the unit label as plain text.
      displayTitle: middleTruncate(file.path, FILE_UNIT_TITLE_MAX),
      kind: role === "test" ? "tests" : "change",
      // Deliberately empty: the context panel shows the connect-a-provider
      // prompt instead of inventing commentary we have no model to write.
      context: "",
      files: [{ fileId: file.path, hunkIds: [], role }],
    };
  });

  return { units };
}
