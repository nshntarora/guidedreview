/**
 * Shared fetch/error helpers for provider HTTP clients.
 */

export interface ProviderHttpErrorDetail {
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

/** @deprecated Prefer parseProviderHttpError — kept for any residual callers. */
export async function safeErrorDetail(response: Response): Promise<string> {
  const detail = await parseProviderHttpError(response);
  return detail.message;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
