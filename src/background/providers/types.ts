import type { ParsedDiff, PRContext, ProviderSettings, ReviewPlan } from "../../lib/types";

export interface AnnotateReviewInput {
  diff: ParsedDiff;
  prContext: PRContext;
  settings: ProviderSettings;
}

export interface ProviderClient {
  /** Send one diff chunk + PR context, get back a schema-valid ReviewPlan. */
  annotateReview(input: AnnotateReviewInput): Promise<ReviewPlan>;
  /** Minimal request to confirm the API key/model combination actually works. */
  testConnection(settings: ProviderSettings): Promise<void>;
}

/** Thrown for any provider-side failure; message is safe to show to the user. */
export class ProviderError extends Error {}
