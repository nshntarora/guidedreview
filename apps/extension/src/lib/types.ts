/**
 * Host types for the Chrome extension. Domain review types live in
 * `@guided-review/core`; this file re-exports them and owns chrome messaging
 * plus GitHub OAuth/submit shapes.
 */

import type { ParsedDiff, ProviderSettings, ReviewContext } from "@guided-review/core";

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

/**
 * Shown when a review that requires a summary is submitted without one. The
 * overlay checks this before calling the background worker so the user gets
 * the error without a round-trip; `submitReview.ts` enforces it again because
 * it is the actual boundary to GitHub.
 */
export const EMPTY_REVIEW_BODY_MESSAGE: Record<"COMMENT" | "REQUEST_CHANGES", string> = {
  COMMENT: "Add a review comment before submitting.",
  REQUEST_CHANGES: "Add a summary explaining the requested changes before submitting.",
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

/** First message on the `annotate-review` port from content → background. */
export interface AnnotateReviewRequest {
  type: "ANNOTATE_REVIEW";
  diff: ParsedDiff;
  prContext: PRContext;
}

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
  /**
   * Start line when the range spans more than one line. Omit on single-line
   * comments — GitHub's create-review API 422s if `start_line`/`start_side`
   * are sent when they equal `line`.
   */
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

type SubmitReviewErrorCode =
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
