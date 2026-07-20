import type {
  AnnotateReviewRequest,
  AnnotateReviewStreamEvent,
  BackgroundRequest,
  DiffFile,
  FetchDiffError,
  FetchDiffRequest,
  FetchDiffResponse,
  GitHubAuthClearResponse,
  GitHubAuthGetResponse,
  GitHubAuthState,
  GitHubDevicePollRequest,
  GitHubDevicePollResponse,
  GitHubDeviceStartResponse,
  ReviewErrorInfo,
  ReviewPlan,
  ReviewUnit,
  SubmitReviewRequest,
  SubmitReviewResponse,
  TestConnectionRequest,
  TestConnectionResponse,
} from "../lib/types";
import {
  clearGitHubAuth,
  getGitHubAuth,
  setGitHubAuth,
} from "../lib/github/authStorage";
import {
  fetchGitHubUser,
  pollAccessToken,
  requestDeviceCode,
} from "../lib/github/deviceOAuth";
import {
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_SCOPES,
  isGitHubOAuthConfigured,
} from "../lib/github/oauthConfig";
import { fetchPRDiff } from "../lib/github/diffFetch";
import { submitPullRequestReview } from "../lib/github/submitReview";
import { chunkDiffByFile } from "../lib/review/buildPrompt";
import { StreamPlanParser } from "../lib/review/streamPlanParser";
import { prefixChunkUnitId, validateAndCleanUnit } from "../lib/review/reviewPlan";
import { getProviderSettings } from "../lib/settings";
import { getProviderClient } from "./providers";
import { ProviderError } from "./providers/types";

const ANNOTATE_PORT_NAME = "annotate-review";

// Toolbar icon opens the action popup (`src/popup/`), which starts a guided
// review on PR pages or explains that the extension only works there.

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
        const response: TestConnectionResponse = { ok: false, error: describeErrorMessage(error) };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "FETCH_DIFF") {
    handleFetchDiff(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        const response: FetchDiffError = { ok: false, error: describeErrorMessage(error) };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "GITHUB_DEVICE_START") {
    handleGitHubDeviceStart()
      .then(sendResponse)
      .catch((error: unknown) => {
        const response: GitHubDeviceStartResponse = {
          ok: false,
          error: describeErrorMessage(error),
        };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "GITHUB_DEVICE_POLL") {
    handleGitHubDevicePoll(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        const response: GitHubDevicePollResponse = {
          ok: false,
          status: "error",
          error: describeErrorMessage(error),
        };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "GITHUB_AUTH_GET") {
    handleGitHubAuthGet()
      .then(sendResponse)
      .catch((error: unknown) => {
        // Still a valid response shape; treat failure as signed-out.
        console.error("GITHUB_AUTH_GET failed:", error);
        const response: GitHubAuthGetResponse = { ok: true, auth: null };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "GITHUB_AUTH_CLEAR") {
    handleGitHubAuthClear()
      .then(sendResponse)
      .catch((error: unknown) => {
        console.error("GITHUB_AUTH_CLEAR failed:", error);
        const response: GitHubAuthClearResponse = { ok: true };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "SUBMIT_REVIEW") {
    handleSubmitReview(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        const response: SubmitReviewResponse = {
          ok: false,
          code: "unknown",
          error: describeErrorMessage(error),
        };
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
      error: {
        message: "No API key configured. Open the extension settings to add one.",
      },
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
    const knownFiles = new Map(chunk.files.map((f) => [f.path, f]));

    for await (const event of client.annotateReviewStream(
      { diff: chunk, prContext: request.prContext, settings },
      { signal },
    )) {
      if (signal.aborted) return;

      if (event.type === "text_delta") {
        const rawUnits = parser.push(event.text);
        for (const raw of rawUnits) {
          emitUnit(raw, knownFiles, chunkIndex, allUnits, port, signal);
        }
      }

      if (event.type === "done") {
        const remaining = parser.finish();
        for (const raw of remaining) {
          emitUnit(raw, knownFiles, chunkIndex, allUnits, port, signal);
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
  chunkIndex: number,
  allUnits: ReviewUnit[],
  port: chrome.runtime.Port,
  signal: AbortSignal,
): void {
  if (signal.aborted) return;

  const cleaned = validateAndCleanUnit(raw, knownFiles);
  if (!cleaned) return;

  const unit: ReviewUnit = { ...cleaned, id: prefixChunkUnitId(chunkIndex, cleaned.id) };
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

async function handleGitHubDeviceStart(): Promise<GitHubDeviceStartResponse> {
  if (!isGitHubOAuthConfigured()) {
    return {
      ok: false,
      error:
        "GitHub connection isn’t configured in this build. Set VITE_GITHUB_CLIENT_ID and rebuild.",
    };
  }

  const device = await requestDeviceCode(GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_SCOPES);
  return {
    ok: true,
    userCode: device.userCode,
    verificationUri: device.verificationUri,
    deviceCode: device.deviceCode,
    interval: device.interval,
    expiresIn: device.expiresIn,
  };
}

async function handleGitHubDevicePoll(
  request: GitHubDevicePollRequest,
): Promise<GitHubDevicePollResponse> {
  if (!isGitHubOAuthConfigured()) {
    return {
      ok: false,
      status: "error",
      error:
        "GitHub connection isn’t configured in this build. Set VITE_GITHUB_CLIENT_ID and rebuild.",
    };
  }

  const result = await pollAccessToken(GITHUB_OAUTH_CLIENT_ID, request.deviceCode);

  switch (result.status) {
    case "pending":
      return { ok: true, status: "pending" };
    case "slow_down":
      return { ok: true, status: "slow_down", interval: result.interval };
    case "expired":
      return {
        ok: false,
        status: "expired",
        error: "The device code expired. Start the connection again.",
      };
    case "denied":
      return {
        ok: false,
        status: "denied",
        error: "GitHub authorization was cancelled. You can try connecting again.",
      };
    case "error":
      return { ok: false, status: "error", error: result.message };
    case "authorized": {
      const user = await fetchGitHubUser(result.accessToken);
      const auth: GitHubAuthState = {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        scope: result.scope,
        login: user.login,
        ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
        ...(user.name ? { name: user.name } : {}),
      };
      await setGitHubAuth(auth);
      return { ok: true, status: "authorized", auth };
    }
    default: {
      const _exhaustive: never = result;
      return {
        ok: false,
        status: "error",
        error: `Unexpected poll status: ${JSON.stringify(_exhaustive)}`,
      };
    }
  }
}

async function handleGitHubAuthGet(): Promise<GitHubAuthGetResponse> {
  const auth = await getGitHubAuth();
  return { ok: true, auth };
}

async function handleGitHubAuthClear(): Promise<GitHubAuthClearResponse> {
  await clearGitHubAuth();
  return { ok: true };
}

async function handleSubmitReview(
  request: SubmitReviewRequest,
): Promise<SubmitReviewResponse> {
  const auth = await getGitHubAuth();
  if (!auth) {
    return {
      ok: false,
      code: "not_authenticated",
      error:
        "Connect GitHub in the extension options before submitting a review.",
    };
  }

  const result = await submitPullRequestReview({
    accessToken: auth.accessToken,
    pr: request.pr,
    body: request.body,
    event: request.event,
    comments: request.comments,
  });

  // Stale / revoked token: drop the stored session so Options shows disconnected.
  if (!result.ok && result.code === "not_authenticated") {
    await clearGitHubAuth();
  }

  return result;
}

function describeError(error: unknown): ReviewErrorInfo {
  if (error instanceof ProviderError) {
    return {
      message: error.message,
      ...(error.statusCode !== undefined ? { statusCode: error.statusCode } : {}),
      ...(error.code !== undefined ? { code: error.code } : {}),
    };
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return { message: "Review annotation was cancelled." };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: "Something went wrong talking to the AI provider." };
}

/** Flatten structured errors for one-shot message responses that still use a string. */
function describeErrorMessage(error: unknown): string {
  return describeError(error).message;
}
