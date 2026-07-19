import type { ParsedDiff, PRContext, ProviderSettings } from "../../lib/types";

export interface AnnotateReviewInput {
  diff: ParsedDiff;
  prContext: PRContext;
  settings: ProviderSettings;
}

export type AnnotateStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "done" };

export interface ProviderClient {
  /**
   * Stream structured ReviewPlan JSON as text deltas. Schema is still enforced
   * server-side; callers assemble/parse the deltas into units.
   */
  annotateReviewStream(
    input: AnnotateReviewInput,
    options?: { signal?: AbortSignal },
  ): AsyncGenerator<AnnotateStreamEvent, void, unknown>;

  /** Minimal request to confirm the API key/model combination actually works. */
  testConnection(settings: ProviderSettings): Promise<void>;
}

/** Thrown for any provider-side failure; message is safe to show to the user. */
export class ProviderError extends Error {}
