import type { FileRole, ParsedDiff, ReviewPlan, ReviewUnit } from "../types";

const TEST_PATH = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[jt]sx?$/i;
const CONFIG_PATH =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum|Cargo\.lock)$|\.(json|ya?ml|toml|ini|lock)$|\.config\.[jt]s$/i;

function roleForPath(path: string): FileRole {
  if (TEST_PATH.test(path)) return "test";
  if (CONFIG_PATH.test(path)) return "config_or_generated";
  return "core_logic";
}

/**
 * Fallback plan for when no AI provider is configured: one review unit per
 * changed file, in diff order. The reviewer still gets the full walkthrough —
 * diff panes, line selection, draft comments, submit — just without the
 * AI-chosen ordering and per-step context.
 */
export function buildFileReviewPlan(diff: ParsedDiff): ReviewPlan {
  const units: ReviewUnit[] = diff.files.map((file, index) => ({
    id: `file-${index}-${file.path}`,
    title: file.path,
    // Deliberately empty: the context panel shows the connect-a-provider
    // prompt instead of inventing commentary we have no model to write.
    context: "",
    files: [{ fileId: file.path, hunkIds: [], role: roleForPath(file.path) }],
  }));

  return { units };
}
