import type { ProviderSettings } from "../../lib/types";
import { buildUserPrompt, SYSTEM_PROMPT } from "../../lib/review/buildPrompt";
import { REVIEW_PLAN_JSON_SCHEMA } from "../../lib/review/reviewSchema";
import { readSseJsonStream } from "./sse";
import type { AnnotateReviewInput, AnnotateStreamEvent, ProviderClient } from "./types";
import { ProviderError } from "./types";

/**
 * Shared implementation for OpenAI and Grok (xAI) — both expose an
 * OpenAI-compatible `/chat/completions` endpoint with the same
 * `response_format: {type: "json_schema", ...}` structured-output shape, so
 * one client covers both providers; only the base URL and display name
 * differ.
 *
 * Streams completion deltas so the overlay can surface completed units early.
 */
export function createOpenAICompatibleProvider(baseUrl: string, displayName: string): ProviderClient {
  const chatUrl = `${baseUrl}/chat/completions`;

  return {
    async *annotateReviewStream(
      { diff, prContext, settings }: AnnotateReviewInput,
      options?: { signal?: AbortSignal },
    ): AsyncGenerator<AnnotateStreamEvent, void, unknown> {
      let response: Response;
      try {
        response = await fetch(chatUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            model: settings.model,
            stream: true,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: buildUserPrompt(diff, prContext) },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "review_plan",
                schema: REVIEW_PLAN_JSON_SCHEMA,
                strict: true,
              },
            },
          }),
          signal: options?.signal,
        });
      } catch (error) {
        if (isAbortError(error)) throw error;
        throw new ProviderError(
          error instanceof Error ? error.message : `Failed to reach the ${displayName} API.`,
        );
      }

      if (!response.ok) {
        const detail = await safeErrorDetail(response);
        throw new ProviderError(`${displayName} API error (${response.status}): ${detail}`);
      }

      if (!response.body) {
        throw new ProviderError(`${displayName} returned an empty stream.`);
      }

      let sawContent = false;

      for await (const event of readSseJsonStream(response.body, { signal: options?.signal })) {
        if (!event || typeof event !== "object") continue;
        const data = event as {
          choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
          error?: { message?: string };
        };

        if (data.error?.message) {
          throw new ProviderError(data.error.message);
        }

        const content = data.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) {
          sawContent = true;
          yield { type: "text_delta", text: content };
        }
      }

      if (!sawContent) {
        throw new ProviderError(`${displayName} returned no content for this diff.`);
      }

      yield { type: "done" };
    },

    async testConnection(settings: ProviderSettings): Promise<void> {
      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 8,
          messages: [{ role: "user", content: "Reply with OK." }],
        }),
      });

      if (!response.ok) {
        const detail = await safeErrorDetail(response);
        throw new ProviderError(`${displayName} API error (${response.status}): ${detail}`);
      }
    },
  };
}

async function safeErrorDetail(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
