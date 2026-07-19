/**
 * Shared fetch/error helpers for provider HTTP clients.
 */

/** Extract a user-safe error message from a failed provider HTTP response. */
export async function safeErrorDetail(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
