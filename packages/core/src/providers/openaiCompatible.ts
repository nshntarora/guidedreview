import type { ProviderSettings } from "../types";
import { buildUserPrompt, SYSTEM_PROMPT } from "../review/buildPrompt";
import { REVIEW_PLAN_JSON_SCHEMA } from "../review/reviewSchema";
import { postProviderJson } from "./http";
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
export function createOpenAICompatibleProvider(
  baseUrl: string,
  displayName: string,
): ProviderClient {
  const chatUrl = `${baseUrl}/chat/completions`;
  const headers = (apiKey: string) => ({ authorization: `Bearer ${apiKey}` });

  return {
    async *annotateReviewStream(
      { diff, context, settings }: AnnotateReviewInput,
      options?: { signal?: AbortSignal },
    ): AsyncGenerator<AnnotateStreamEvent, void, unknown> {
      const response = await postProviderJson(
        chatUrl,
        headers(settings.apiKey),
        {
          model: settings.model,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(diff, context) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "review_plan",
              schema: REVIEW_PLAN_JSON_SCHEMA,
              strict: true,
            },
          },
        },
        displayName,
        options?.signal,
      );

      if (!response.body) {
        throw new ProviderError(`${displayName} returned an empty stream.`);
      }

      let sawContent = false;

      for await (const event of readSseJsonStream(response.body, { signal: options?.signal })) {
        if (!event || typeof event !== "object") continue;
        const data = event as {
          choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
          error?: { message?: string; code?: string; type?: string };
        };

        if (data.error?.message) {
          throw new ProviderError(data.error.message, {
            code: data.error.code ?? data.error.type,
          });
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
      await postProviderJson(
        chatUrl,
        headers(settings.apiKey),
        {
          model: settings.model,
          max_tokens: 8,
          messages: [{ role: "user", content: "Reply with OK." }],
        },
        displayName,
      );
    },
  };
}
