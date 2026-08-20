/**
 * Minimal SSE line parser for provider streaming responses.
 * Yields parsed JSON objects from `data:` lines; ignores comments/event names.
 */

export async function* readSseJsonStream(
  body: ReadableStream<Uint8Array>,
  options?: { signal?: AbortSignal },
): AsyncGenerator<unknown, void, unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (options?.signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";

      for (const rawLine of parts) {
        const line = rawLine.replace(/\r$/, "");
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trimStart();
        if (!data || data === "[DONE]") {
          if (data === "[DONE]") return;
          continue;
        }

        try {
          yield JSON.parse(data) as unknown;
        } catch {
          // Skip malformed SSE data lines rather than aborting the whole stream.
        }
      }
    }

    // Flush any trailing data line without a final newline.
    const trailing = buffer.replace(/\r$/, "");
    if (trailing.startsWith("data:")) {
      const data = trailing.slice(5).trimStart();
      if (data && data !== "[DONE]") {
        try {
          yield JSON.parse(data) as unknown;
        } catch {
          // Skip malformed SSE data lines rather than aborting the whole stream.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
