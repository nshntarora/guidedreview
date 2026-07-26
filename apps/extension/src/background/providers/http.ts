/**
 * Shared fetch/error helpers for provider HTTP clients.
 */

import { ProviderError } from "./types";

interface ProviderHttpErrorDetail {
  /** Exact provider message when present; otherwise statusText or a fallback. */
  message: string;
  /** Provider error code/type when present (e.g. invalid_api_key, authentication_error). */
  code?: string;
}

/**
 * Extract a user-safe message and optional provider error code from a failed
 * provider HTTP response. Supports OpenAI-compatible and Anthropic error shapes.
 */
export async function parseProviderHttpError(response: Response): Promise<ProviderHttpErrorDetail> {
  try {
    const data = (await response.json()) as unknown;
    if (!data || typeof data !== "object") {
      return { message: response.statusText || `HTTP ${response.status}` };
    }

    const root = data as Record<string, unknown>;
    const nested =
      root.error && typeof root.error === "object" ? (root.error as Record<string, unknown>) : null;

    // OpenAI / Grok: { error: { message, code?, type? } }
    // Anthropic:     { error: { type, message } } or { type: "error", error: { ... } }
    const messageSource = nested ?? root;
    const message =
      typeof messageSource.message === "string" && messageSource.message.trim()
        ? messageSource.message
        : response.statusText || `HTTP ${response.status}`;

    const code =
      (typeof nested?.code === "string" && nested.code) ||
      (typeof nested?.type === "string" && nested.type) ||
      (typeof root.code === "string" && root.code) ||
      (typeof root.type === "string" && root.type !== "error" ? root.type : undefined) ||
      undefined;

    return code ? { message, code } : { message };
  } catch {
    return { message: response.statusText || `HTTP ${response.status}` };
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * POST a JSON body to a provider endpoint and return the successful response.
 *
 * Throws `ProviderError` for both transport failures and non-2xx responses — a
 * bare fetch rejection would otherwise surface as "Failed to fetch" with no
 * hint of which provider failed. Abort errors pass through untouched so
 * cancellation stays distinguishable from a real failure.
 */
export async function postProviderJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  providerName: string,
  signal?: AbortSignal,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ProviderError(
      error instanceof Error ? error.message : `Failed to reach the ${providerName} API.`,
    );
  }

  if (!response.ok) {
    const detail = await parseProviderHttpError(response);
    throw new ProviderError(detail.message, {
      statusCode: response.status,
      code: detail.code,
    });
  }

  return response;
}
