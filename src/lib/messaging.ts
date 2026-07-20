import type {
  AnnotateReviewRequest,
  AnnotateReviewStreamEvent,
  TestConnectionRequest,
  TestConnectionResponse,
  FetchDiffRequest,
  FetchDiffResponse,
  FetchDiffError,
  ParsedDiff,
  PRContext,
  ProviderSettings,
  ReviewErrorInfo,
  ReviewPlan,
  ReviewUnit,
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
