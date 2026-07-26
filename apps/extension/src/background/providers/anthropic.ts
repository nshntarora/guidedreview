import type { ProviderSettings } from "../../lib/types";
import { buildUserPrompt, SYSTEM_PROMPT } from "../../lib/review/buildPrompt";
import { REVIEW_PLAN_JSON_SCHEMA } from "../../lib/review/reviewSchema";
import { postProviderJson } from "./http";
import { readSseJsonStream } from "./sse";
import type { AnnotateReviewInput, AnnotateStreamEvent, ProviderClient } from "./types";
import { ProviderError } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";

function headers(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    // Documented "bring your own API key" browser-CORS opt-in, which lets the
    // background worker call the Messages API directly.
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

/**
 * Claude implementation. Uses `output_config.format` to force a schema-valid
 * ReviewPlan rather than parsing free text, and streams text deltas so the UI
 * can surface units early.
 */
export const anthropicProvider: ProviderClient = {
  async *annotateReviewStream(
    { diff, prContext, settings }: AnnotateReviewInput,
    options?: { signal?: AbortSignal },
  ): AsyncGenerator<AnnotateStreamEvent, void, unknown> {
    const response = await postProviderJson(
      API_URL,
      headers(settings.apiKey),
      {
        model: settings.model,
        max_tokens: 8000,
        stream: true,
        system: SYSTEM_PROMPT,
        output_config: {
          effort: "medium",
          format: { type: "json_schema", schema: REVIEW_PLAN_JSON_SCHEMA },
        },
        messages: [{ role: "user", content: buildUserPrompt(diff, prContext) }],
      },
      "Claude",
      options?.signal,
    );

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
    await postProviderJson(
      API_URL,
      headers(settings.apiKey),
      {
        model: settings.model,
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with OK." }],
      },
      "Claude",
    );
  },
};
