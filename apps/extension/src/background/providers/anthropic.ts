import type { ProviderSettings } from "../../lib/types";
import { buildUserPrompt, SYSTEM_PROMPT } from "../../lib/review/buildPrompt";
import { REVIEW_PLAN_JSON_SCHEMA } from "../../lib/review/reviewSchema";
import { isAbortError, parseProviderHttpError } from "./http";
import { readSseJsonStream } from "./sse";
import type { AnnotateReviewInput, AnnotateStreamEvent, ProviderClient } from "./types";
import { ProviderError } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Claude implementation. Uses `anthropic-dangerous-direct-browser-access` to
 * call the Messages API directly from the extension's background worker
 * (this is the documented "bring your own API key" browser-CORS opt-in) and
 * `output_config.format` to force a schema-valid ReviewPlan rather than
 * parsing free text. Streams text deltas so the UI can surface units early.
 */
export const anthropicProvider: ProviderClient = {
  async *annotateReviewStream(
    { diff, prContext, settings }: AnnotateReviewInput,
    options?: { signal?: AbortSignal },
  ): AsyncGenerator<AnnotateStreamEvent, void, unknown> {
    const body = {
      model: settings.model,
      max_tokens: 8000,
      stream: true,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: REVIEW_PLAN_JSON_SCHEMA },
      },
      messages: [{ role: "user", content: buildUserPrompt(diff, prContext) }],
    };

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": settings.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new ProviderError(
        error instanceof Error ? error.message : "Failed to reach the Claude API.",
      );
    }

    if (!response.ok) {
      const detail = await parseProviderHttpError(response);
      throw new ProviderError(detail.message, {
        statusCode: response.status,
        code: detail.code,
      });
    }

    if (!response.body) {
      throw new ProviderError("Claude returned an empty stream.");
    }

    let sawContent = false;

    for await (const event of readSseJsonStream(response.body, { signal: options?.signal })) {
      if (!event || typeof event !== "object") continue;
      const ev = event as {
        type?: string;
        delta?: { type?: string; text?: string; stop_reason?: string };
        error?: { message?: string; type?: string };
      };

      if (ev.type === "error") {
        throw new ProviderError(ev.error?.message ?? "Claude stream error.", {
          code: ev.error?.type,
        });
      }

      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
        sawContent = true;
        yield { type: "text_delta", text: ev.delta.text };
      }

      if (ev.type === "message_delta" && ev.delta?.stop_reason === "refusal") {
        throw new ProviderError("Claude declined to annotate this diff.");
      }
    }

    if (!sawContent) {
      throw new ProviderError("Claude returned no content for this diff.");
    }

    yield { type: "done" };
  },

  async testConnection(settings: ProviderSettings): Promise<void> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with OK." }],
      }),
    });

    if (!response.ok) {
      const detail = await parseProviderHttpError(response);
      throw new ProviderError(detail.message, {
        statusCode: response.status,
        code: detail.code,
      });
    }
  },
};
