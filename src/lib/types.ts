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
  | "schema_or_model"
  | "core_logic"
  | "consumer_or_call_site"
  | "test"
  | "config_or_generated";

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

// ---- Messaging protocol (content <-> background) -----------------------------

/** First message on the `annotate-review` port from content → background. */
export interface AnnotateReviewRequest {
  type: "ANNOTATE_REVIEW";
  diff: ParsedDiff;
  prContext: PRContext;
}

/**
 * Progressive events on the `annotate-review` port from background → content.
 * Complete, validated units are pushed as they become available; DONE carries
 * the final merged plan; ERROR ends the stream with a user-safe message.
 */
export type AnnotateReviewStreamEvent =
  | { type: "UNIT"; unit: ReviewUnit }
  | { type: "DONE"; plan: ReviewPlan }
  | { type: "ERROR"; error: string };

export interface TestConnectionRequest {
  type: "TEST_CONNECTION";
  settings: ProviderSettings;
}

export interface TestConnectionResponse {
  ok: boolean;
  error?: string;
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

/** One-shot request/response messages (annotate uses a port instead). */
export type BackgroundRequest = TestConnectionRequest | FetchDiffRequest;
