/**
 * Host types for the Chrome extension. Domain review types live in
 * `@guided-review/core`; this file re-exports them and owns chrome messaging
 * plus GitHub OAuth/submit shapes.
 */

import type { ParsedDiff, ProviderSettings, ReviewContext } from "@guided-review/core";
import type { ReviewEvent, ReviewCommentInput } from "@guided-review/ui/review/types";
export type {
  ReviewEvent,
  ReviewCommentInput,
  SubmitReviewResponse,
} from "@guided-review/ui/review/types";
export { EMPTY_REVIEW_BODY_MESSAGE } from "@guided-review/ui/review/types";

export type {
  DiffLine,
  DiffHunk,
  FileChangeStatus,
  DiffFile,
  ParsedDiff,
  ReviewContext,
  FileRole,
  UnitKind,
  ReviewUnitFileRef,
  ReviewUnit,
  ReviewPlan,
  ProviderSettings,
  ReviewErrorInfo,
  AnnotateStreamStatusPhase,
  AnnotateReviewStreamEvent,
} from "@guided-review/core";

export {
  FILE_ROLES,
  DEFAULT_FILE_ROLE,
  UNIT_KINDS,
  DEFAULT_UNIT_KIND,
  NO_API_KEY_ERROR_CODE,
} from "@guided-review/core";

/**
 * GitHub PR identity + review context. `source` is always github for this host;
 * omitted on older in-memory fixtures and coerced at the annotate boundary.
 */
export type PRContext = ReviewContext & {
  owner: string;
  repo: string;
  number: number;
  url: string;
  author: string;
};

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

/**
 * Wire `type` strings for chrome.runtime messages. Interfaces below use these
 * so producers and the background switch stay on one source of truth.
 */
export const MessageType = {
  ANNOTATE_REVIEW: "ANNOTATE_REVIEW",
  TEST_CONNECTION: "TEST_CONNECTION",
  OPEN_OPTIONS: "OPEN_OPTIONS",
  FETCH_DIFF: "FETCH_DIFF",
  FETCH_FILE_PREVIEW: "FETCH_FILE_PREVIEW",
  GITHUB_DEVICE_START: "GITHUB_DEVICE_START",
  GITHUB_DEVICE_POLL: "GITHUB_DEVICE_POLL",
  GITHUB_AUTH_GET: "GITHUB_AUTH_GET",
  GITHUB_AUTH_CLEAR: "GITHUB_AUTH_CLEAR",
  SUBMIT_REVIEW: "SUBMIT_REVIEW",
  START_GUIDED_REVIEW: "START_GUIDED_REVIEW",
} as const;

/** First message on the `annotate-review` port from content → background. */
export interface AnnotateReviewRequest {
  type: typeof MessageType.ANNOTATE_REVIEW;
  diff: ParsedDiff;
  prContext: PRContext;
}

export interface TestConnectionRequest {
  type: typeof MessageType.TEST_CONNECTION;
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
  type: typeof MessageType.OPEN_OPTIONS;
}

export interface OpenOptionsResponse {
  ok: boolean;
}

export interface FetchDiffRequest {
  type: typeof MessageType.FETCH_DIFF;
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

export interface FetchFilePreviewRequest {
  type: typeof MessageType.FETCH_FILE_PREVIEW;
  pr: { owner: string; repo: string; number: number };
  path: string;
  ref: string;
}

export type FetchFilePreviewResponse = { ok: true; dataUrl: string } | { ok: false; error: string };

// ---- GitHub device OAuth messaging ------------------------------------------

export interface GitHubDeviceStartRequest {
  type: typeof MessageType.GITHUB_DEVICE_START;
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
  type: typeof MessageType.GITHUB_DEVICE_POLL;
  deviceCode: string;
}

/** Discriminated outcomes for the Options-owned poll loop. */
export type GitHubDevicePollResponse =
  | { ok: true; status: "pending" }
  | { ok: true; status: "slow_down"; interval: number }
  | { ok: true; status: "authorized"; auth: GitHubAuthState }
  | { ok: false; status: "expired" | "denied" | "error"; error: string };

export interface GitHubAuthGetRequest {
  type: typeof MessageType.GITHUB_AUTH_GET;
}

export interface GitHubAuthGetResponse {
  ok: true;
  auth: GitHubPublicAuthState | null;
}

export interface GitHubAuthClearRequest {
  type: typeof MessageType.GITHUB_AUTH_CLEAR;
}

export interface GitHubAuthClearResponse {
  ok: true;
}

// ---- Submit pull request review ---------------------------------------------

export interface SubmitReviewRequest {
  type: typeof MessageType.SUBMIT_REVIEW;
  pr: { owner: string; repo: string; number: number };
  body: string;
  event: ReviewEvent;
  comments: ReviewCommentInput[];
}

/** One-shot request/response messages (annotate uses a port instead). */
export type BackgroundRequest =
  | TestConnectionRequest
  | OpenOptionsRequest
  | FetchDiffRequest
  | FetchFilePreviewRequest
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
  type: typeof MessageType.START_GUIDED_REVIEW;
}

export type ContentRequest = StartGuidedReviewMessage;
