/**
 * Shared types used across content script, background worker, and options page.
 */

// ---- Diff model -----------------------------------------------------------

export interface DiffLine {
  type: "add" | "del" | "context";
  content: string;
  /** Line number in the old file (undefined for pure additions). */
  oldLine?: number;
  /** Line number in the new file (undefined for pure deletions). */
  newLine?: number;
}

export interface DiffHunk {
  /** Stable id: `${filePath}#${index}` */
  id: string;
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export type FileChangeStatus = "added" | "removed" | "modified" | "renamed";

export interface DiffFile {
  path: string;
  previousPath?: string;
  status: FileChangeStatus;
  hunks: DiffHunk[];
  /** True when the diff for this file was elided (e.g. binary, too large). */
  isBinaryOrElided: boolean;
}

export interface ParsedDiff {
  files: DiffFile[];
}

// ---- PR context -------------------------------------------------------------

export interface PRContext {
  owner: string;
  repo: string;
  number: number;
  url: string;
  title: string;
  description: string;
  descriptionHtml: string;
  author: string;
  baseRef: string;
  headRef: string;
}

// ---- Review plan (LLM structured output) ------------------------------------

export type FileRole =
  "schema_or_model" | "core_logic" | "consumer_or_call_site" | "test" | "config_or_generated";

export interface ReviewUnitFileRef {
  fileId: string;
  /** Hunk ids within the file relevant to this unit; empty = whole file. */
  hunkIds: string[];
  role: FileRole;
}

export interface ReviewUnit {
  id: string;
  title: string;
  /** Why the change was made (inferred). */
  context: string;
  files: ReviewUnitFileRef[];
}

export interface ReviewPlan {
  /** Review units in the order the human should walk through them. */
  units: ReviewUnit[];
}

// ---- Provider / settings -----------------------------------------------------
// ProviderId and DEFAULT_MODELS live in the catalog so the options UI and
// background clients share one registry of providers/models.

export type { ProviderId } from "./providers/catalog";
export { DEFAULT_MODELS } from "./providers/catalog";
import type { ProviderId } from "./providers/catalog";

export interface ProviderSettings {
  provider: ProviderId;
  model: string;
  apiKey: string;
}

// ---- GitHub OAuth (device flow) ----------------------------------------------

/** Persisted after a successful device authorization. */
export interface GitHubAuthState {
  accessToken: string;
  tokenType: string;
  scope: string;
  /** From GET /user after connect. */
  login: string;
  avatarUrl?: string;
  name?: string;
}

/**
 * `GitHubAuthState` without the access token. `GITHUB_AUTH_GET` is answered
 * from the background worker for both the options page and the content
 * script — neither needs the raw token (submission goes through
 * `SUBMIT_REVIEW`, which reads it from storage background-side), so it's
 * never sent across that boundary.
 */
export type GitHubPublicAuthState = Omit<GitHubAuthState, "accessToken" | "tokenType">;

// ---- Messaging protocol (content <-> background) -----------------------------

/** First message on the `annotate-review` port from content → background. */
export interface AnnotateReviewRequest {
  type: "ANNOTATE_REVIEW";
  diff: ParsedDiff;
  prContext: PRContext;
}

/**
 * User-facing details for a failed review annotation (or related) step.
 * `message` is always present; HTTP status / provider codes are optional.
 */
export interface ReviewErrorInfo {
  message: string;
  statusCode?: number;
  /** Provider-specific code, e.g. `invalid_api_key` or `authentication_error`. */
  code?: string;
}

/**
 * Error code for "no AI provider configured". Not a failure the user should see
 * as an error — the overlay turns it into the connect-a-provider prompt.
 */
export const NO_API_KEY_ERROR_CODE = "no_api_key";

/**
 * Progressive events on the `annotate-review` port from background → content.
 * Complete, validated units are pushed as they become available; DONE carries
 * the final merged plan; ERROR ends the stream with structured error details.
 */
export type AnnotateReviewStreamEvent =
  | { type: "UNIT"; unit: ReviewUnit }
  | { type: "DONE"; plan: ReviewPlan }
  | { type: "ERROR"; error: ReviewErrorInfo };

export interface TestConnectionRequest {
  type: "TEST_CONNECTION";
  settings: ProviderSettings;
}

export interface TestConnectionResponse {
  ok: boolean;
  error?: string;
}

/**
 * Content scripts can't call `chrome.runtime.openOptionsPage` themselves, so
 * the overlay asks the background worker to open Settings on its behalf.
 */
export interface OpenOptionsRequest {
  type: "OPEN_OPTIONS";
}

export interface OpenOptionsResponse {
  ok: boolean;
}

export interface FetchDiffRequest {
  type: "FETCH_DIFF";
  pr: { owner: string; repo: string; number: number };
}

export interface FetchDiffResponse {
  ok: true;
  diff: ParsedDiff;
}

export interface FetchDiffError {
  ok: false;
  error: string;
}

// ---- GitHub device OAuth messaging ------------------------------------------

export interface GitHubDeviceStartRequest {
  type: "GITHUB_DEVICE_START";
}

export type GitHubDeviceStartResponse =
  | {
      ok: true;
      userCode: string;
      verificationUri: string;
      deviceCode: string;
      interval: number;
      expiresIn: number;
    }
  | { ok: false; error: string };

export interface GitHubDevicePollRequest {
  type: "GITHUB_DEVICE_POLL";
  deviceCode: string;
}

/** Discriminated outcomes for the Options-owned poll loop. */
export type GitHubDevicePollResponse =
  | { ok: true; status: "pending" }
  | { ok: true; status: "slow_down"; interval: number }
  | { ok: true; status: "authorized"; auth: GitHubAuthState }
  | { ok: false; status: "expired" | "denied" | "error"; error: string };

export interface GitHubAuthGetRequest {
  type: "GITHUB_AUTH_GET";
}

export interface GitHubAuthGetResponse {
  ok: true;
  auth: GitHubPublicAuthState | null;
}

export interface GitHubAuthClearRequest {
  type: "GITHUB_AUTH_CLEAR";
}

export interface GitHubAuthClearResponse {
  ok: true;
}

// ---- Submit pull request review ---------------------------------------------

/** GitHub pull request review event (create-review API). */
export type ReviewEvent = "COMMENT" | "APPROVE" | "REQUEST_CHANGES";

/** Inline comment payload for GitHub create-review `comments[]`. */
export interface ReviewCommentInput {
  path: string;
  body: string;
  side: "LEFT" | "RIGHT";
  /** End line (file coordinates on `side`). */
  line: number;
  /** Start line when multi-line; omit when single-line. */
  startLine?: number;
  startSide?: "LEFT" | "RIGHT";
}

export interface SubmitReviewRequest {
  type: "SUBMIT_REVIEW";
  pr: { owner: string; repo: string; number: number };
  body: string;
  event: ReviewEvent;
  comments: ReviewCommentInput[];
}

export type SubmitReviewErrorCode =
  "not_authenticated" | "forbidden" | "not_found" | "validation" | "network" | "unknown";

export type SubmitReviewResponse =
  | { ok: true; reviewId: number; htmlUrl: string }
  | { ok: false; error: string; code?: SubmitReviewErrorCode };

/** One-shot request/response messages (annotate uses a port instead). */
export type BackgroundRequest =
  | TestConnectionRequest
  | OpenOptionsRequest
  | FetchDiffRequest
  | GitHubDeviceStartRequest
  | GitHubDevicePollRequest
  | GitHubAuthGetRequest
  | GitHubAuthClearRequest
  | SubmitReviewRequest;

// ---- Messaging protocol (background → content) -----------------------------

/**
 * Toolbar action click on a PR page: content should open the overlay and
 * start (or resume) the guided review for the current PR.
 */
export interface StartGuidedReviewMessage {
  type: "START_GUIDED_REVIEW";
}

export type ContentRequest = StartGuidedReviewMessage;
