/**
 * Create a submitted pull request review via the GitHub REST API.
 * Pure HTTP — auth token is provided by the caller (background worker).
 *
 * @see https://docs.github.com/en/rest/pulls/reviews#create-a-review-for-a-pull-request
 */

import type { ReviewCommentInput, ReviewEvent, SubmitReviewResponse } from "@extension/lib/types";
import { EMPTY_REVIEW_BODY_MESSAGE } from "@extension/lib/types";
import type { PRIdentity } from "./diffFetch";

type SubmitReviewFailure = Extract<SubmitReviewResponse, { ok: false }>;

const API_VERSION = "2022-11-28";
const ACCEPT = "application/vnd.github+json";

interface SubmitPullRequestReviewParams {
  accessToken: string;
  pr: PRIdentity;
  body: string;
  event: ReviewEvent;
  comments: ReviewCommentInput[];
}

/**
 * POST a review (with optional inline comments) and submit it in one call
 * by setting `event` to COMMENT | APPROVE | REQUEST_CHANGES.
 *
 * Always preflights with GET pull (OAuth token) to verify access and obtain
 * head.sha for `commit_id`.
 */
export async function submitPullRequestReview(
  params: SubmitPullRequestReviewParams,
): Promise<SubmitReviewResponse> {
  const { accessToken, pr, event, comments } = params;
  const body = params.body.trim();

  if ((event === "COMMENT" || event === "REQUEST_CHANGES") && body.length === 0) {
    return {
      ok: false,
      code: "validation",
      error: EMPTY_REVIEW_BODY_MESSAGE[event],
    };
  }

  const head = await fetchPullHeadSha(accessToken, pr);
  if (!head.ok) return head;

  const url = `https://api.github.com/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/reviews`;
  const payload: Record<string, unknown> = {
    event,
    commit_id: head.sha,
    comments: comments.map(toApiComment),
  };
  if (body.length > 0) payload.body = body;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: githubApiHeaders(accessToken),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      ok: false,
      code: "network",
      error: networkMessage("submitting the review", error),
    };
  }

  const responseBody = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    return mapHttpError(response.status, responseBody, {
      action: "submitting the review",
      pr,
    });
  }

  const reviewId = numberField(responseBody, "id");
  const htmlUrl = stringField(responseBody, "html_url");
  if (reviewId === undefined || !htmlUrl) {
    return {
      ok: false,
      code: "unknown",
      error: "GitHub accepted the review but returned an unexpected response.",
    };
  }

  return { ok: true, reviewId, htmlUrl };
}

async function fetchPullHeadSha(
  accessToken: string,
  pr: PRIdentity,
): Promise<{ ok: true; sha: string } | SubmitReviewFailure> {
  const url = `https://api.github.com/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: githubApiHeaders(accessToken),
    });
  } catch (error) {
    return {
      ok: false,
      code: "network",
      error: networkMessage("loading the pull request", error),
    };
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    return mapHttpError(response.status, body, {
      action: "loading the pull request",
      pr,
    });
  }

  const head = body?.head;
  const sha =
    head && typeof head === "object" && head !== null
      ? stringField(head as Record<string, unknown>, "sha")
      : undefined;

  if (!sha) {
    return {
      ok: false,
      code: "unknown",
      error: `Could not determine the head commit for ${formatPr(pr)} to attach the review.`,
    };
  }

  return { ok: true, sha };
}

function toApiComment(comment: ReviewCommentInput): Record<string, unknown> {
  const api: Record<string, unknown> = {
    path: comment.path,
    body: comment.body,
    line: comment.line,
    side: comment.side,
  };
  // GitHub 422s if start_line/start_side are sent when the range is one line.
  if (comment.startLine !== undefined && comment.startLine !== comment.line) {
    api.start_line = comment.startLine;
    api.start_side = comment.startSide ?? comment.side;
  }
  return api;
}

function githubApiHeaders(accessToken: string): Record<string, string> {
  return {
    Accept: ACCEPT,
    Authorization: `Bearer ${accessToken}`,
    "X-GitHub-Api-Version": API_VERSION,
    "Content-Type": "application/json",
  };
}

function mapHttpError(
  status: number,
  body: Record<string, unknown> | null,
  ctx: { action: string; pr: PRIdentity },
): SubmitReviewFailure {
  const apiDetail = githubErrorDetail(body);
  const prLabel = formatPr(ctx.pr);

  if (status === 401) {
    return {
      ok: false,
      code: "not_authenticated",
      error: composeError(
        `GitHub rejected the token while ${ctx.action} for ${prLabel} (HTTP 401).`,
        apiDetail,
        "Reconnect GitHub in the extension options.",
      ),
    };
  }

  if (status === 403) {
    return {
      ok: false,
      code: "forbidden",
      error: composeError(
        `Permission denied while ${ctx.action} for ${prLabel} (HTTP 403).`,
        apiDetail,
        "You don’t have permission to review this pull request, or the OAuth app lacks the required scope.",
      ),
    };
  }

  if (status === 404) {
    return {
      ok: false,
      code: "not_found",
      error: composeError(
        `Could not access ${prLabel} while ${ctx.action} (HTTP 404).`,
        apiDetail,
        "Confirm the PR still exists and that your connected GitHub account can open it. For private org repos, authorize SSO for the Guided Review token (GitHub → Settings → Applications) or reconnect GitHub with repo access in Options.",
      ),
    };
  }

  if (status === 422) {
    return {
      ok: false,
      code: "validation",
      error: composeError(
        `GitHub rejected the review for ${prLabel} (HTTP 422).`,
        apiDetail,
        "Check that line comments still match the current diff.",
      ),
    };
  }

  return {
    ok: false,
    code: "unknown",
    error: composeError(
      `Could not finish ${ctx.action} for ${prLabel} (HTTP ${status}).`,
      apiDetail,
    ),
  };
}

/**
 * Build a multi-clause user-facing error. Never returns a bare one-word API
 * message like "Not Found" without status / action context.
 */
function composeError(lead: string, apiDetail?: string, hint?: string): string {
  const parts = [lead];
  if (apiDetail && apiDetail !== lead) {
    // Avoid repeating an identical lead; still attach GitHub's detail.
    parts.push(apiDetail);
  }
  if (hint) parts.push(hint);
  return parts.join(" ");
}

/** GitHub `message` + all `errors[]` + optional `documentation_url`. */
function githubErrorDetail(body: Record<string, unknown> | null): string | undefined {
  if (!body) return undefined;

  const message = stringField(body, "message");
  const errorParts: string[] = [];

  const errors = body.errors;
  if (Array.isArray(errors)) {
    for (const entry of errors) {
      if (typeof entry === "string" && entry.length > 0) {
        errorParts.push(entry);
        continue;
      }
      if (entry && typeof entry === "object") {
        const errMsg = stringField(entry as Record<string, unknown>, "message");
        if (errMsg) errorParts.push(errMsg);
      }
    }
  }

  const docs = stringField(body, "documentation_url");

  const segments: string[] = [];
  if (message) {
    segments.push(errorParts.length > 0 ? `${message}: ${errorParts.join("; ")}` : message);
  } else if (errorParts.length > 0) {
    segments.push(errorParts.join("; "));
  }
  if (docs) segments.push(`Docs: ${docs}`);

  return segments.length > 0 ? segments.join(" ") : undefined;
}

function formatPr(pr: PRIdentity): string {
  return `${pr.owner}/${pr.repo}#${pr.number}`;
}

function networkMessage(action: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `Network error while ${action}: ${detail}`;
}

function stringField(body: Record<string, unknown> | null, key: string): string | undefined {
  if (!body) return undefined;
  const value = body[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberField(body: Record<string, unknown> | null, key: string): number | undefined {
  if (!body) return undefined;
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
