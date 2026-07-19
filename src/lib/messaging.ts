import type {
  AnnotateReviewRequest,
  AnnotateReviewResponse,
  AnnotateReviewError,
  TestConnectionRequest,
  TestConnectionResponse,
  FetchDiffRequest,
  FetchDiffResponse,
  FetchDiffError,
  ParsedDiff,
  PRContext,
  ProviderSettings,
} from "./types";

/** Content-script-side helper: ask the background worker to annotate a diff. */
export async function requestReviewPlan(
  diff: ParsedDiff,
  prContext: PRContext,
): Promise<AnnotateReviewResponse | AnnotateReviewError> {
  const request: AnnotateReviewRequest = { type: "ANNOTATE_REVIEW", diff, prContext };
  return chrome.runtime.sendMessage(request);
}

/** Options-page-side helper: ask the background worker to test a provider config. */
export async function testConnection(
  settings: ProviderSettings,
): Promise<TestConnectionResponse> {
  const request: TestConnectionRequest = { type: "TEST_CONNECTION", settings };
  return chrome.runtime.sendMessage(request);
}

/**
 * Content-script-side helper: ask the background worker to fetch a PR's diff.
 * This has to go through the background worker rather than fetching directly
 * from the content script — GitHub's `.diff` URL redirects to a host that
 * sends no CORS headers, which the page-origin fetch would be blocked by.
 */
export async function requestPRDiff(
  pr: FetchDiffRequest["pr"],
): Promise<FetchDiffResponse | FetchDiffError> {
  const request: FetchDiffRequest = { type: "FETCH_DIFF", pr };
  return chrome.runtime.sendMessage(request);
}
