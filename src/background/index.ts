import type {
  AnnotateReviewRequest,
  AnnotateReviewStreamEvent,
  BackgroundRequest,
  DiffFile,
  FetchDiffError,
  FetchDiffRequest,
  FetchDiffResponse,
  ReviewPlan,
  ReviewUnit,
  TestConnectionRequest,
  TestConnectionResponse,
} from "../lib/types";
import { fetchPRDiff } from "../lib/github/diffFetch";
import { chunkDiffByFile } from "../lib/review/buildPrompt";
import { StreamPlanParser } from "../lib/review/streamPlanParser";
import { validateAndCleanUnit } from "../lib/review/reviewPlan";
import { getProviderSettings } from "../lib/settings";
import { getProviderClient } from "./providers";
import { ProviderError } from "./providers/types";

const ANNOTATE_PORT_NAME = "annotate-review";

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

/**
 * Long-lived port for streaming annotate results. Content opens the port,
 * posts ANNOTATE_REVIEW, and receives UNIT / DONE / ERROR events.
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== ANNOTATE_PORT_NAME) return;

  const abort = new AbortController();
  let started = false;

  port.onDisconnect.addListener(() => {
    abort.abort();
  });

  port.onMessage.addListener((message: AnnotateReviewRequest) => {
    if (message?.type !== "ANNOTATE_REVIEW") return;
    if (started) return;
    started = true;

    void handleAnnotateReviewStream(message, port, abort.signal).catch((error: unknown) => {
      if (abort.signal.aborted) return;
      postEvent(port, { type: "ERROR", error: describeError(error) });
    });
  });
});

async function handleAnnotateReviewStream(
  request: AnnotateReviewRequest,
  port: chrome.runtime.Port,
  signal: AbortSignal,
): Promise<void> {
  const settings = await getProviderSettings();

  if (!settings.apiKey) {
    postEvent(port, {
      type: "ERROR",
      error: "No API key configured. Open the extension settings to add one.",
    });
    return;
  }

  if (signal.aborted) return;

  const client = getProviderClient(settings.provider);
  const chunks = chunkDiffByFile(request.diff);
  const allUnits: ReviewUnit[] = [];

  let chunkIndex = 0;
  for (const chunk of chunks) {
    if (chunk.files.length === 0) continue;
    if (signal.aborted) return;

    const parser = new StreamPlanParser();
    const prefix = `c${chunkIndex}-`;
    const knownFiles = new Map(chunk.files.map((f) => [f.path, f]));

    for await (const event of client.annotateReviewStream(
      { diff: chunk, prContext: request.prContext, settings },
      { signal },
    )) {
      if (signal.aborted) return;

      if (event.type === "text_delta") {
        const rawUnits = parser.push(event.text);
        for (const raw of rawUnits) {
          emitUnit(raw, knownFiles, prefix, allUnits, port, signal);
        }
      }

      if (event.type === "done") {
        const remaining = parser.finish();
        for (const raw of remaining) {
          emitUnit(raw, knownFiles, prefix, allUnits, port, signal);
        }
      }
    }

    chunkIndex++;
  }

  if (signal.aborted) return;

  const plan: ReviewPlan = { units: allUnits };
  postEvent(port, { type: "DONE", plan });
}

function emitUnit(
  raw: ReviewUnit,
  knownFiles: Map<string, DiffFile>,
  prefix: string,
  allUnits: ReviewUnit[],
  port: chrome.runtime.Port,
  signal: AbortSignal,
): void {
  if (signal.aborted) return;

  const cleaned = validateAndCleanUnit(raw, knownFiles);
  if (!cleaned) return;

  const unit: ReviewUnit = { ...cleaned, id: `${prefix}${cleaned.id}` };
  allUnits.push(unit);
  postEvent(port, { type: "UNIT", unit });
}

function postEvent(port: chrome.runtime.Port, event: AnnotateReviewStreamEvent): void {
  try {
    port.postMessage(event);
  } catch {
    // Port already disconnected — nothing to do.
  }
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
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Review annotation was cancelled.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong talking to the AI provider.";
}
