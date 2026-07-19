import type { ProviderSettings, ReviewPlan } from "../../lib/types";
import { buildUserPrompt, SYSTEM_PROMPT } from "../../lib/review/buildPrompt";
import { REVIEW_PLAN_JSON_SCHEMA } from "../../lib/review/reviewSchema";
import type { AnnotateReviewInput, ProviderClient } from "./types";
import { ProviderError } from "./types";

/**
 * Shared implementation for OpenAI and Grok (xAI) — both expose an
 * OpenAI-compatible `/chat/completions` endpoint with the same
 * `response_format: {type: "json_schema", ...}` structured-output shape, so
 * one client covers both providers; only the base URL and display name
 * differ.
 *
 * Not fully prompt-tuned in v1 (Claude is the wired-up default), but present
 * and selectable so adding real coverage later is a config change, not new
 * plumbing.
 */
export function createOpenAICompatibleProvider(baseUrl: string, displayName: string): ProviderClient {
  const chatUrl = `${baseUrl}/chat/completions`;

  return {
    async annotateReview({ diff, prContext, settings }: AnnotateReviewInput): Promise<ReviewPlan> {
      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
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
      });

      if (!response.ok) {
        const detail = await safeErrorDetail(response);
        throw new ProviderError(`${displayName} API error (${response.status}): ${detail}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new ProviderError(`${displayName} returned no content for this diff.`);
      }

      try {
        return JSON.parse(content) as ReviewPlan;
      } catch {
        throw new ProviderError(`${displayName} returned a response that wasn't valid JSON.`);
      }
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
