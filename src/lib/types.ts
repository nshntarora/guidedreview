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

export type ProviderId = "anthropic" | "openai" | "grok";

export interface ProviderSettings {
  provider: ProviderId;
  model: string;
  apiKey: string;
}

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-4.1",
  grok: "grok-4",
};

// ---- Messaging protocol (content <-> background) -----------------------------

export interface AnnotateReviewRequest {
  type: "ANNOTATE_REVIEW";
  diff: ParsedDiff;
  prContext: PRContext;
}

export interface AnnotateReviewResponse {
  ok: true;
  plan: ReviewPlan;
}

export interface AnnotateReviewError {
  ok: false;
  error: string;
}

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

export type BackgroundRequest = AnnotateReviewRequest | TestConnectionRequest | FetchDiffRequest;
