import type {
  AnnotateReviewError,
  AnnotateReviewRequest,
  AnnotateReviewResponse,
  BackgroundRequest,
  FetchDiffError,
  FetchDiffRequest,
  FetchDiffResponse,
  ReviewPlan,
  TestConnectionRequest,
  TestConnectionResponse,
} from "../lib/types";
import { fetchPRDiff } from "../lib/github/diffFetch";
import { chunkDiffByFile } from "../lib/review/buildPrompt";
import { mergePlans, validateAndCleanPlan } from "../lib/review/reviewPlan";
import { getProviderSettings } from "../lib/settings";
import { getProviderClient } from "./providers";
import { ProviderError } from "./providers/types";

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Content scripts run in an "untrusted" context and are blocked from
// chrome.storage.session by default. The overlay persists/restores review
// sessions from the content script, so grant it access here.
chrome.storage.session
  .setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })
  .catch((error) => console.error("Failed to set storage.session access level:", error));

chrome.runtime.onMessage.addListener((message: BackgroundRequest, _sender, sendResponse) => {
  if (message.type === "ANNOTATE_REVIEW") {
    handleAnnotateReview(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        const response: AnnotateReviewError = { ok: false, error: describeError(error) };
        sendResponse(response);
      });
    return true; // keep the message channel open for the async response
  }

  if (message.type === "TEST_CONNECTION") {
    handleTestConnection(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        const response: TestConnectionResponse = { ok: false, error: describeError(error) };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "FETCH_DIFF") {
    handleFetchDiff(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        const response: FetchDiffError = { ok: false, error: describeError(error) };
        sendResponse(response);
      });
    return true;
  }

  return false;
});

async function handleAnnotateReview(
  request: AnnotateReviewRequest,
): Promise<AnnotateReviewResponse | AnnotateReviewError> {
  const settings = await getProviderSettings();

  if (!settings.apiKey) {
    return { ok: false, error: "No API key configured. Open the extension settings to add one." };
  }

  const client = getProviderClient(settings.provider);
  const chunks = chunkDiffByFile(request.diff);

  const plans: ReviewPlan[] = [];
  for (const chunk of chunks) {
    if (chunk.files.length === 0) continue;
    const rawPlan = await client.annotateReview({
      diff: chunk,
      prContext: request.prContext,
      settings,
    });
    plans.push(validateAndCleanPlan(rawPlan, chunk));
  }

  const merged = mergePlans(plans);
  return { ok: true, plan: merged };
}

async function handleTestConnection(request: TestConnectionRequest): Promise<TestConnectionResponse> {
  const client = getProviderClient(request.settings.provider);
  await client.testConnection(request.settings);
  return { ok: true };
}

// Fetching the diff has to happen here rather than in the content script:
// github.com's `.diff` URL redirects to patch-diff.githubusercontent.com,
// which sends no CORS headers, so a fetch from the page origin is blocked.
// The background service worker isn't subject to page CORS, so it can follow
// the redirect and read the response as long as the target host is listed in
// `host_permissions`.
async function handleFetchDiff(request: FetchDiffRequest): Promise<FetchDiffResponse> {
  const diff = await fetchPRDiff(request.pr);
  return { ok: true, diff };
}

function describeError(error: unknown): string {
  if (error instanceof ProviderError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong talking to the AI provider.";
}
