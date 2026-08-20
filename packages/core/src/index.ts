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
  ReviewNote,
} from "./types";

export {
  FILE_ROLES,
  DEFAULT_FILE_ROLE,
  UNIT_KINDS,
  DEFAULT_UNIT_KIND,
  NO_API_KEY_ERROR_CODE,
} from "./types";

export { parseDiff, parseUnifiedDiff } from "./diff/parse";
export { summarizeDiff } from "./diff/summary";
export type { DiffSummary, FileDiffSummary } from "./diff/summary";

export { middleTruncate } from "./middleTruncate";

export { SYSTEM_PROMPT, buildUserPrompt, chunkDiffByFile } from "./review/buildPrompt";
export { REVIEW_PLAN_JSON_SCHEMA } from "./review/reviewSchema";
export { StreamPlanParser } from "./review/streamPlanParser";
export {
  isTestPath,
  roleForPath,
  prefixChunkUnitId,
  parseReviewUnit,
  stripDuplicateHunks,
  FILE_UNIT_TITLE_MAX,
  buildFileReviewPlan,
} from "./review/reviewPlan";
export { resolveUnitFiles } from "./review/resolveUnitFiles";
export type { ResolvedUnitFile } from "./review/resolveUnitFiles";
export { annotateReview, describeError, describeErrorMessage } from "./review/annotate";
export type { AnnotateReviewInput } from "./review/annotate";

export {
  PROVIDERS,
  PROVIDER_LIST,
  MODELS,
  getProvider,
  modelsForProvider,
  defaultModelFor,
  normalizeProviderSettings,
} from "./providers/catalog";
export type { ProviderId } from "./providers/catalog";
export { getProviderClient } from "./providers";
export { ProviderError } from "./providers/types";
export type {
  ProviderClient,
  AnnotateStreamEvent,
  AnnotateReviewInput as ProviderAnnotateInput,
} from "./providers/types";

export { formatNotesMarkdown } from "./notes/formatNotes";
