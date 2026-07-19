import type { ProviderSettings, ReviewPlan } from "../../lib/types";
import { buildUserPrompt, SYSTEM_PROMPT } from "../../lib/review/buildPrompt";
import { REVIEW_PLAN_JSON_SCHEMA } from "../../lib/review/reviewSchema";
import type { AnnotateReviewInput, ProviderClient } from "./types";
import { ProviderError } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Claude implementation. Uses `anthropic-dangerous-direct-browser-access` to
 * call the Messages API directly from the extension's background worker
 * (this is the documented "bring your own API key" browser-CORS opt-in) and
 * `output_config.format` to force a schema-valid ReviewPlan rather than
 * parsing free text.
 */
export const anthropicProvider: ProviderClient = {
  async annotateReview({ diff, prContext, settings }: AnnotateReviewInput): Promise<ReviewPlan> {
    const body = {
      model: settings.model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: REVIEW_PLAN_JSON_SCHEMA },
      },
      messages: [{ role: "user", content: buildUserPrompt(diff, prContext) }],
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await safeErrorDetail(response);
      throw new ProviderError(`Claude API error (${response.status}): ${detail}`);
    }

    const data = await response.json();

    if (data.stop_reason === "refusal") {
      throw new ProviderError("Claude declined to annotate this diff.");
    }

    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
    if (!textBlock) {
      throw new ProviderError("Claude returned no content for this diff.");
    }

    try {
      return JSON.parse(textBlock.text) as ReviewPlan;
    } catch {
      throw new ProviderError("Claude returned a response that wasn't valid JSON.");
    }
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
      const detail = await safeErrorDetail(response);
      throw new ProviderError(`Claude API error (${response.status}): ${detail}`);
    }
  },
};

async function safeErrorDetail(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
