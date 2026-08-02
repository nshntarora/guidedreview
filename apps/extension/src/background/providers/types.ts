import type { ParsedDiff, PRContext, ProviderSettings } from "@extension/lib/types";

export interface AnnotateReviewInput {
  diff: ParsedDiff;
  prContext: PRContext;
  settings: ProviderSettings;
}

export type AnnotateStreamEvent = { type: "text_delta"; text: string } | { type: "done" };

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

/**
 * Thrown for any provider-side failure. `message` is safe to show to the user
 * and should be the exact provider message when one was returned. Optional
 * `statusCode` / `code` carry HTTP status and provider error codes.
 */
export class ProviderError extends Error {
  readonly statusCode?: number;
  /** Provider-specific code, e.g. `invalid_api_key` or `authentication_error`. */
  readonly code?: string;

  constructor(message: string, options?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = "ProviderError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
  }
}
