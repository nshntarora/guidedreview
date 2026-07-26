import { describe, expect, it } from "vitest";
import { readSseJsonStream } from "./sse";

/** Build a ReadableStream that emits each string as one chunk, as the network would. */
function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>, signal?: AbortSignal) {
  const out: unknown[] = [];
  for await (const event of readSseJsonStream(stream, { signal })) out.push(event);
  return out;
}

describe("readSseJsonStream", () => {
  it("yields parsed JSON from each data line", async () => {
    const events = await collect(streamOf('data: {"a":1}\n', 'data: {"a":2}\n'));

    expect(events).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("reassembles a frame split across chunk boundaries", async () => {
    // Providers routinely split a single SSE frame mid-token.
    const events = await collect(streamOf('data: {"text":"hel', 'lo"}\n'));

    expect(events).toEqual([{ text: "hello" }]);
  });

  it("stops at [DONE] and ignores anything after it", async () => {
    const events = await collect(streamOf('data: {"a":1}\n', "data: [DONE]\n", 'data: {"a":2}\n'));

    expect(events).toEqual([{ a: 1 }]);
  });

  it("handles CRLF line endings", async () => {
    const events = await collect(streamOf('data: {"a":1}\r\ndata: {"a":2}\r\n'));

    expect(events).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("skips comments, event names, and blank lines", async () => {
    const events = await collect(
      streamOf(": keep-alive\n", "event: message\n", "\n", 'data: {"a":1}\n'),
    );

    expect(events).toEqual([{ a: 1 }]);
  });

  it("skips a malformed data line rather than aborting the stream", async () => {
    const events = await collect(streamOf("data: {not json}\n", 'data: {"a":1}\n'));

    expect(events).toEqual([{ a: 1 }]);
  });

  it("flushes a trailing data line that never got a final newline", async () => {
    const events = await collect(streamOf('data: {"a":1}\n', 'data: {"a":2}'));

    expect(events).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("throws AbortError when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(collect(streamOf('data: {"a":1}\n'), controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
