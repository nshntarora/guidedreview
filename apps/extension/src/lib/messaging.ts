import type {
  AnnotateReviewRequest,
  AnnotateReviewStreamEvent,
  TestConnectionRequest,
  TestConnectionResponse,
  FetchDiffRequest,
  FetchDiffResponse,
  FetchDiffError,
  GitHubAuthClearRequest,
  GitHubAuthClearResponse,
  GitHubAuthGetRequest,
  GitHubAuthGetResponse,
  GitHubDevicePollRequest,
  GitHubDevicePollResponse,
  GitHubDeviceStartRequest,
  GitHubDeviceStartResponse,
  OpenOptionsRequest,
  OpenOptionsResponse,
  ParsedDiff,
  PRContext,
  ProviderSettings,
  ReviewCommentInput,
  ReviewErrorInfo,
  ReviewEvent,
  ReviewPlan,
  ReviewUnit,
  SubmitReviewRequest,
  SubmitReviewResponse,
} from "./types";

const ANNOTATE_PORT_NAME = "annotate-review";

export interface StreamReviewPlanHandlers {
  onUnit: (unit: ReviewUnit) => void;
  onDone: (plan: ReviewPlan) => void;
  onError: (error: ReviewErrorInfo) => void;
}

/**
 * Open a long-lived port to the background worker and stream a structured
 * review plan. Completed units arrive via `onUnit` as they validate; `onDone`
 * receives the final merged plan. Call `cancel()` to abort (disconnects the
 * port, which aborts the in-flight provider request).
 */
export function streamReviewPlan(
  diff: ParsedDiff,
  prContext: PRContext,
  handlers: StreamReviewPlanHandlers,
): { cancel: () => void } {
  const port = chrome.runtime.connect({ name: ANNOTATE_PORT_NAME });
  let settled = false;

  const finish = (fn: () => void): void => {
    if (settled) return;
    settled = true;
    fn();
  };

  port.onMessage.addListener((message: AnnotateReviewStreamEvent) => {
    if (!message || typeof message !== "object" || !("type" in message)) return;

    switch (message.type) {
      case "UNIT":
        handlers.onUnit(message.unit);
        return;
      case "DONE":
        finish(() => handlers.onDone(message.plan));
        try {
          port.disconnect();
        } catch {
          // already disconnected
        }
        return;
      case "ERROR":
        finish(() => handlers.onError(message.error));
        try {
          port.disconnect();
        } catch {
          // already disconnected
        }
        return;
      default:
        return;
    }
  });

  port.onDisconnect.addListener(() => {
    // If the background dies or the port drops without DONE/ERROR, surface it.
    finish(() => {
      const err = chrome.runtime.lastError?.message;
      handlers.onError({
        message: err ?? "Lost connection to the review worker before the plan finished.",
      });
    });
  });

  const request: AnnotateReviewRequest = { type: "ANNOTATE_REVIEW", diff, prContext };
  port.postMessage(request);

  return {
    cancel: () => {
      settled = true;
      try {
        port.disconnect();
      } catch {
        // already disconnected
      }
    },
  };
}

/** Options-page-side helper: ask the background worker to test a provider config. */
export async function testConnection(settings: ProviderSettings): Promise<TestConnectionResponse> {
  const request: TestConnectionRequest = { type: "TEST_CONNECTION", settings };
  return chrome.runtime.sendMessage(request);
}

/**
 * Content-script-side helper: open the extension's options page. Content
 * scripts have no access to `chrome.runtime.openOptionsPage`, so the worker
 * does it for them.
 */
export async function openOptionsPage(): Promise<OpenOptionsResponse> {
  const request: OpenOptionsRequest = { type: "OPEN_OPTIONS" };
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

/** Options: begin GitHub device OAuth (returns user_code for the user to enter). */
export async function startGitHubDeviceAuth(): Promise<GitHubDeviceStartResponse> {
  const request: GitHubDeviceStartRequest = { type: "GITHUB_DEVICE_START" };
  return chrome.runtime.sendMessage(request);
}

/** Options: one poll tick while waiting for the user to authorize. */
export async function pollGitHubDeviceAuth(deviceCode: string): Promise<GitHubDevicePollResponse> {
  const request: GitHubDevicePollRequest = { type: "GITHUB_DEVICE_POLL", deviceCode };
  return chrome.runtime.sendMessage(request);
}

/** Options: load the stored GitHub session (or null). */
export async function getGitHubAuthStatus(): Promise<GitHubAuthGetResponse> {
  const request: GitHubAuthGetRequest = { type: "GITHUB_AUTH_GET" };
  return chrome.runtime.sendMessage(request);
}

/** Options: disconnect and forget the stored GitHub token. */
export async function clearGitHubAuthSession(): Promise<GitHubAuthClearResponse> {
  const request: GitHubAuthClearRequest = { type: "GITHUB_AUTH_CLEAR" };
  return chrome.runtime.sendMessage(request);
}

/**
 * Content-script-side helper: submit a PR review (summary + optional line
 * comments) through the background worker, which holds the OAuth token.
 */
export async function submitPullRequestReview(
  pr: SubmitReviewRequest["pr"],
  body: string,
  event: ReviewEvent,
  comments: ReviewCommentInput[],
): Promise<SubmitReviewResponse> {
  const request: SubmitReviewRequest = {
    type: "SUBMIT_REVIEW",
    pr,
    body,
    event,
    comments,
  };
  return chrome.runtime.sendMessage(request);
}
