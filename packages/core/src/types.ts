/**
 * Domain types for the review engine. Hosts (extension, CLI) share this
 * schema. Chrome messaging and GitHub OAuth types stay in the host.
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

// ---- Review context ---------------------------------------------------------

/**
 * Host-supplied metadata for the prompt and the walkthrough header.
 * GitHub PRs fill the optional identity fields; local reviews omit them.
 */
export interface ReviewContext {
  title: string;
  description: string;
  descriptionHtml?: string;
  baseRef: string;
  headRef: string;
  /** Host that produced this context. Omitted on older GitHub fixtures; treat as github. */
  source?: "github" | "local";
  owner?: string;
  repo?: string;
  number?: number;
  url?: string;
  author?: string;
}

// ---- Review plan (LLM structured output) ------------------------------------

/**
 * The roles a changed file can play in a review unit, in review order.
 * Single source of truth: the `FileRole` union, the runtime validation set in
 * `review/reviewPlan.ts`, and the JSON Schema enum in `review/reviewSchema.ts`
 * are all derived from this array.
 */
export const FILE_ROLES = [
  "schema_or_model",
  "core_logic",
  "consumer_or_call_site",
  "test",
  "config_or_generated",
] as const;

export type FileRole = (typeof FILE_ROLES)[number];

/** Role assigned when the model omits one or returns something unrecognized. */
export const DEFAULT_FILE_ROLE: FileRole = "core_logic";

/**
 * Whether a review unit is production code or tests. Tests are always a
 * separate unit (never mixed with production files). Single source of truth
 * for the JSON schema enum and runtime validation.
 */
export const UNIT_KINDS = ["change", "tests"] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];

/** Kind assigned when the model omits one or returns something unrecognized. */
export const DEFAULT_UNIT_KIND: UnitKind = "change";

export interface ReviewUnitFileRef {
  fileId: string;
  /** Hunk ids within the file relevant to this unit; empty = whole file. */
  hunkIds: string[];
  role: FileRole;
}

export interface ReviewUnit {
  id: string;
  title: string;
  /**
   * When set, the overlay shows this instead of `title`. The no-AI
   * one-unit-per-file plan sets this to a middle-truncated path so the UI
   * renders the label as plain text (no path-aware truncation at render).
   * AI units omit it and show `title`. Not model output (not in the LLM schema).
   */
  displayTitle?: string;
  /**
   * `change` = production (and optional config); `tests` = test files only.
   * Never mixed — validation splits impure units.
   */
  kind: UnitKind;
  /** Why the change was made (inferred). */
  context: string;
  files: ReviewUnitFileRef[];
}

export interface ReviewPlan {
  /** Review units in the order the human should walk through them. */
  units: ReviewUnit[];
}

// ---- Provider / settings -----------------------------------------------------

import type { ProviderId } from "./providers/catalog";

export interface ProviderSettings {
  provider: ProviderId;
  model: string;
  apiKey: string;
  /**
   * How to send `apiKey`. Anthropic defaults to `x-api-key`; OpenAI-compatible
   * clients always use Bearer. Coding-agent OAuth tokens set `bearer`.
   */
  authScheme?: "api-key" | "bearer";
  /** Merged into the provider request. Used by agent adapters (e.g. Anthropic beta). */
  extraHeaders?: Record<string, string>;
}

// ---- Annotate stream (host-agnostic) ----------------------------------------

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
 * as an error — hosts turn it into the connect-a-provider prompt.
 */
export const NO_API_KEY_ERROR_CODE = "no_api_key";

/**
 * Progressive events from `annotateReview`. Complete, validated units are
 * pushed as they become available; DONE carries the final merged plan; ERROR
 * ends the stream with structured error details. STATUS updates the
 * walkthrough's build-phase subtext (waiting / first token).
 */
export type AnnotateStreamStatusPhase = "waiting_for_tokens" | "tokens_streaming";

export type AnnotateReviewStreamEvent =
  | { type: "STATUS"; phase: AnnotateStreamStatusPhase }
  | { type: "UNIT"; unit: ReviewUnit }
  | { type: "DONE"; plan: ReviewPlan }
  | { type: "ERROR"; error: ReviewErrorInfo };

// ---- Notes (copy / export) --------------------------------------------------

/** One locally saved line note. Hosts map their draft-comment shape onto this. */
export interface ReviewNote {
  filePath: string;
  /** Inclusive display line numbers (file coordinates). */
  startLine: number;
  endLine: number;
  body: string;
  /** Review unit id active when the note was saved, if any. */
  unitId?: string;
}
