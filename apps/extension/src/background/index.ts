import type {
  AnnotateReviewRequest,
  AnnotateReviewStreamEvent,
  BackgroundRequest,
  FetchDiffError,
  FetchDiffRequest,
  FetchDiffResponse,
  GitHubAuthClearResponse,
  GitHubAuthGetResponse,
  GitHubAuthState,
  GitHubDevicePollRequest,
  GitHubDevicePollResponse,
  GitHubDeviceStartResponse,
  OpenOptionsResponse,
  ParsedDiff,
  PRContext,
  ProviderSettings,
  ReviewErrorInfo,
  ReviewPlan,
  ReviewUnit,
  SubmitReviewRequest,
  SubmitReviewResponse,
  TestConnectionRequest,
  TestConnectionResponse,
} from "../lib/types";
import { NO_API_KEY_ERROR_CODE } from "../lib/types";
import { clearGitHubAuth, getGitHubAuth, setGitHubAuth } from "../lib/github/authStorage";
import { fetchGitHubUser, pollAccessToken, requestDeviceCode } from "../lib/github/deviceOAuth";
import {
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_NOT_CONFIGURED,
  GITHUB_OAUTH_SCOPES,
  isGitHubOAuthConfigured,
} from "../lib/github/oauthConfig";
import { fetchPRDiff, parsePRUrl } from "../lib/github/diffFetch";
import { submitPullRequestReview } from "../lib/github/submitReview";
import { chunkDiffByFile } from "../lib/review/buildPrompt";
import { StreamPlanParser } from "../lib/review/streamPlanParser";
import { parseReviewUnit, prefixChunkUnitId, stripDuplicateHunks } from "../lib/review/reviewPlan";
import { getProviderSettings } from "../lib/settings";
import { grantSessionAccessToContentScripts } from "../lib/storage";
import { getProviderClient } from "./providers";
import { ProviderError, type ProviderClient } from "./providers/types";

const ANNOTATE_PORT_NAME = "annotate-review";

/** Packaged welcome page path (stable across builds; matches Vite multi-page input). */
export const WELCOME_PAGE_PATH = "src/welcome/index.html";

// Content scripts run in an "untrusted" context and are blocked from
// chrome.storage.session by default. The overlay persists/restores review
// sessions from the content script, so grant it access here.
grantSessionAccessToContentScripts().catch((error) =>
  console.error("Failed to set storage.session access level:", error),
);

/**
 * First-install only: open the welcome page. Never on update — no "What's New" tab.
 * Load-unpacked also fires `install` (useful for local QA).
 */
export function handleInstalled(details: { reason: string }): void {
  if (details.reason !== "install") return;
  void chrome.tabs.create({
    url: chrome.runtime.getURL(WELCOME_PAGE_PATH),
  });
}

chrome.runtime.onInstalled.addListener(handleInstalled);

/**
 * Reject anything that didn't come from this extension's own pages or content
 * scripts. `externally_connectable` is unset, so Chrome already blocks web
 * pages from reaching us — this is the belt to that braces, so adding an
 * external surface later can't silently hand a caller the GitHub token.
 */
function isOwnSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id;
}

/**
 * Content-script requests that act on a specific PR must be for the PR that
 * tab is actually showing. Without this the worker will fetch a diff from, or
 * post a review to, any repo the message names — the `repo`-scoped OAuth token
 * covers all of them. Extension pages (options, popup) have no `sender.tab` and
 * are trusted as-is.
 */
export function senderMatchesPR(
  sender: chrome.runtime.MessageSender,
  pr: { owner: string; repo: string; number: number },
): boolean {
  if (!sender.tab) return true;
  if (sender.origin !== undefined && sender.origin !== "https://github.com") return false;

  const tabPr = sender.tab.url ? parsePRUrl(sender.tab.url) : null;
  if (!tabPr) return false;
  return tabPr.owner === pr.owner && tabPr.repo === pr.repo && tabPr.number === pr.number;
}

const WRONG_TAB_ERROR = "This request did not come from the pull request page it names.";

/**
 * Wire an async handler to a one-shot message response.
 *
 * Every rejection has to resolve to a valid response for that message type —
 * a swallowed rejection would leave the caller's `sendMessage` promise hanging
 * forever. Returning `true` (which callers must propagate) is what tells Chrome
 * to keep the message channel open until `sendResponse` fires.
 */
function respondAsync<T>(
  work: Promise<T>,
  sendResponse: (response: T) => void,
  onError: (error: unknown) => T,
): true {
  work.then(sendResponse).catch((error: unknown) => sendResponse(onError(error)));
  return true;
}

chrome.runtime.onMessage.addListener((message: BackgroundRequest, sender, sendResponse) => {
  if (!isOwnSender(sender)) return false;

  if (message.type === "TEST_CONNECTION") {
    return respondAsync<TestConnectionResponse>(
      handleTestConnection(message),
      sendResponse,
      (e) => ({
        ok: false,
        error: describeErrorMessage(e),
      }),
    );
  }

  if (message.type === "OPEN_OPTIONS") {
    // The only synchronous handler — `openOptionsPage` has no async work to wait on.
    try {
      chrome.runtime.openOptionsPage();
      sendResponse({ ok: true } satisfies OpenOptionsResponse);
    } catch (error: unknown) {
      console.error("OPEN_OPTIONS failed:", error);
      sendResponse({ ok: false } satisfies OpenOptionsResponse);
    }
    return false;
  }

  if (message.type === "FETCH_DIFF") {
    if (!senderMatchesPR(sender, message.pr)) {
      sendResponse({ ok: false, error: WRONG_TAB_ERROR } satisfies FetchDiffError);
      return true;
    }
    return respondAsync<FetchDiffResponse | FetchDiffError>(
      handleFetchDiff(message),
      sendResponse,
      (e) => ({ ok: false, error: describeErrorMessage(e) }),
    );
  }

  if (message.type === "GITHUB_DEVICE_START") {
    return respondAsync<GitHubDeviceStartResponse>(
      handleGitHubDeviceStart(),
      sendResponse,
      (e) => ({ ok: false, error: describeErrorMessage(e) }),
    );
  }

  if (message.type === "GITHUB_DEVICE_POLL") {
    return respondAsync<GitHubDevicePollResponse>(
      handleGitHubDevicePoll(message),
      sendResponse,
      (e) => ({ ok: false, status: "error", error: describeErrorMessage(e) }),
    );
  }

  if (message.type === "GITHUB_AUTH_GET") {
    // A storage failure isn't worth surfacing to the options page: report it as
    // signed-out, which is the state the user can act on.
    return respondAsync<GitHubAuthGetResponse>(handleGitHubAuthGet(), sendResponse, (e) => {
      console.error("GITHUB_AUTH_GET failed:", e);
      return { ok: true, auth: null };
    });
  }

  if (message.type === "GITHUB_AUTH_CLEAR") {
    // Same reasoning: the caller's intent was to end up disconnected either way.
    return respondAsync<GitHubAuthClearResponse>(handleGitHubAuthClear(), sendResponse, (e) => {
      console.error("GITHUB_AUTH_CLEAR failed:", e);
      return { ok: true };
    });
  }

  if (message.type === "SUBMIT_REVIEW") {
    if (!senderMatchesPR(sender, message.pr)) {
      sendResponse({
        ok: false,
        code: "validation",
        error: WRONG_TAB_ERROR,
      } satisfies SubmitReviewResponse);
      return true;
    }
    return respondAsync<SubmitReviewResponse>(handleSubmitReview(message), sendResponse, (e) => ({
      ok: false,
      code: "unknown",
      error: describeErrorMessage(e),
    }));
  }

  return false;
});

/**
 * Long-lived port for streaming annotate results. Content opens the port,
 * posts ANNOTATE_REVIEW, and receives UNIT / DONE / ERROR events.
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== ANNOTATE_PORT_NAME) return;
  // Same-extension check as onMessage: this port spends the user's API key.
  if (!port.sender || !isOwnSender(port.sender)) {
    port.disconnect();
    return;
  }

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

  // The content script pre-checks this before opening the port; this is the
  // backstop. The code lets the overlay render the connect-a-provider prompt
  // rather than a red error box.
  if (!settings.apiKey) {
    postEvent(port, {
      type: "ERROR",
      error: {
        message: "No API key configured. Open the extension settings to add one.",
        code: NO_API_KEY_ERROR_CODE,
      },
    });
    return;
  }

  if (signal.aborted) return;

  const client = getProviderClient(settings.provider);
  const chunks = chunkDiffByFile(request.diff).filter((chunk) => chunk.files.length > 0);
  const allUnits: ReviewUnit[] = [];
  /** First unit that claims a hunk id wins; later duplicates are stripped. */
  const seenHunkIds = new Set<string>();

  for (const [chunkIndex, chunk] of chunks.entries()) {
    if (signal.aborted) return;

    for await (const unit of streamChunkUnits(client, chunk, request.prContext, settings, {
      chunkIndex,
      seenHunkIds,
      signal,
    })) {
      if (signal.aborted) return;
      allUnits.push(unit);
      postEvent(port, { type: "UNIT", unit });
    }
  }

  if (signal.aborted) return;

  const plan: ReviewPlan = { units: allUnits };
  postEvent(port, { type: "DONE", plan });
}

/**
 * Stream one diff chunk through the provider and yield the review units that
 * survive validation, already deduplicated and namespaced by chunk. Yields
 * nothing further once `signal` aborts.
 */
async function* streamChunkUnits(
  client: ProviderClient,
  chunk: ParsedDiff,
  prContext: PRContext,
  settings: ProviderSettings,
  {
    chunkIndex,
    seenHunkIds,
    signal,
  }: { chunkIndex: number; seenHunkIds: Set<string>; signal: AbortSignal },
): AsyncGenerator<ReviewUnit, void, unknown> {
  const parser = new StreamPlanParser();
  // Keyed by path because the schema defines `fileId` as "the file path exactly
  // as it appears in the diff" (see REVIEW_PLAN_JSON_SCHEMA) — the same
  // assumption `resolveUnitFiles` makes when rendering.
  const knownFiles = new Map(chunk.files.map((file) => [file.path, file]));

  for await (const event of client.annotateReviewStream(
    { diff: chunk, prContext, settings },
    { signal },
  )) {
    if (signal.aborted) return;

    const raw =
      event.type === "text_delta"
        ? parser.push(event.text)
        : event.type === "done"
          ? parser.finish()
          : [];

    for (const candidate of raw) {
      // One raw object can yield two units — a mixed production/test unit is
      // split into change-then-tests.
      for (const cleaned of parseReviewUnit(candidate, knownFiles)) {
        if (signal.aborted) return;
        const deduped = stripDuplicateHunks(cleaned, knownFiles, seenHunkIds);
        if (!deduped) continue;
        // Namespace the id so units from different chunks can't collide.
        yield { ...deduped, id: prefixChunkUnitId(chunkIndex, deduped.id) };
      }
    }
  }
}

function postEvent(port: chrome.runtime.Port, event: AnnotateReviewStreamEvent): void {
  try {
    port.postMessage(event);
  } catch {
    // Port already disconnected — nothing to do.
  }
}

async function handleTestConnection(
  request: TestConnectionRequest,
): Promise<TestConnectionResponse> {
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
    return { ok: false, error: GITHUB_OAUTH_NOT_CONFIGURED };
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
    return { ok: false, status: "error", error: GITHUB_OAUTH_NOT_CONFIGURED };
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
  }
}

export async function handleGitHubAuthGet(): Promise<GitHubAuthGetResponse> {
  const auth = await getGitHubAuth();
  if (!auth) return { ok: true, auth: null };
  // Strip the access token before it leaves the background worker — neither
  // the options page nor the content script needs it; SUBMIT_REVIEW reads it
  // from storage directly, background-side.
  const { accessToken: _accessToken, tokenType: _tokenType, ...publicAuth } = auth;
  return { ok: true, auth: publicAuth };
}

async function handleGitHubAuthClear(): Promise<GitHubAuthClearResponse> {
  await clearGitHubAuth();
  return { ok: true };
}

async function handleSubmitReview(request: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  const auth = await getGitHubAuth();
  if (!auth) {
    return {
      ok: false,
      code: "not_authenticated",
      error: "Connect GitHub in the extension options before submitting a review.",
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
  return { message: "Could not reach the AI provider." };
}

/** Flatten structured errors for one-shot message responses that still use a string. */
function describeErrorMessage(error: unknown): string {
  return describeError(error).message;
}
