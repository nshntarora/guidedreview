import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotateReviewInput } from "./types";

vi.mock("./http", () => ({
  postProviderJson: vi.fn(),
}));

import { postProviderJson } from "./http";
import { anthropicProvider } from "./anthropic";

const postMock = vi.mocked(postProviderJson);

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function okStreamResponse(body: ReadableStream<Uint8Array>): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

const input: AnnotateReviewInput = {
  diff: { files: [] },
  context: {
    source: "github",
    owner: "acme",
    repo: "widgets",
    number: 1,
    url: "https://github.com/acme/widgets/pull/1",
    title: "Add widgets",
    description: "",
    descriptionHtml: "",
    author: "octocat",
    baseRef: "main",
    headRef: "feat",
  },
  settings: { provider: "anthropic", model: "claude-sonnet-4-5", apiKey: "sk-ant-test" },
};

async function collect(
  gen: AsyncGenerator<{ type: string; text?: string }, void, unknown>,
): Promise<Array<{ type: string; text?: string }>> {
  const out: Array<{ type: string; text?: string }> = [];
  for await (const event of gen) out.push(event);
  return out;
}

describe("anthropicProvider", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("streams text deltas then done", async () => {
    postMock.mockResolvedValue(
      okStreamResponse(
        streamOf(
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"{\\"units\\""}}\n',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":":[]}"}}\n',
          'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n',
        ),
      ),
    );

    const events = await collect(anthropicProvider.annotateReviewStream(input));

    expect(postMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        "x-api-key": "sk-ant-test",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      }),
      expect.objectContaining({
        model: "claude-sonnet-4-5",
        stream: true,
        max_tokens: 8000,
        output_config: expect.objectContaining({
          format: expect.objectContaining({ type: "json_schema" }),
        }),
      }),
      "Claude",
      undefined,
    );
    expect(events).toEqual([
      { type: "text_delta", text: '{"units"' },
      { type: "text_delta", text: ":[]}" },
      { type: "done" },
    ]);
  });

  it("throws when the response body is empty", async () => {
    postMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(collect(anthropicProvider.annotateReviewStream(input))).rejects.toThrow(
      /Claude returned an empty stream/,
    );
  });

  it("throws ProviderError on stream error events", async () => {
    postMock.mockResolvedValue(
      okStreamResponse(
        streamOf(
          'data: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n',
        ),
      ),
    );

    await expect(collect(anthropicProvider.annotateReviewStream(input))).rejects.toMatchObject({
      name: "ProviderError",
      message: "Overloaded",
      code: "overloaded_error",
    });
  });

  it("throws when Claude refuses the request", async () => {
    postMock.mockResolvedValue(
      okStreamResponse(
        streamOf(
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"partial"}}\n',
          'data: {"type":"message_delta","delta":{"stop_reason":"refusal"}}\n',
        ),
      ),
    );

    await expect(collect(anthropicProvider.annotateReviewStream(input))).rejects.toThrow(
      /declined to annotate/,
    );
  });

  it("throws when the stream yields no content", async () => {
    postMock.mockResolvedValue(okStreamResponse(streamOf('data: {"type":"message_start"}\n')));

    await expect(collect(anthropicProvider.annotateReviewStream(input))).rejects.toThrow(
      /Claude returned no content/,
    );
  });

  it("testConnection posts a minimal probe request", async () => {
    postMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await anthropicProvider.testConnection(input.settings);

    expect(postMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({ "x-api-key": "sk-ant-test" }),
      expect.objectContaining({
        model: "claude-sonnet-4-5",
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with OK." }],
      }),
      "Claude",
    );
  });

  it("skips non-object SSE frames without aborting", async () => {
    postMock.mockResolvedValue(
      okStreamResponse(
        streamOf(
          "data: null\n",
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n',
        ),
      ),
    );

    const events = await collect(anthropicProvider.annotateReviewStream(input));
    expect(events).toEqual([{ type: "text_delta", text: "ok" }, { type: "done" }]);
  });
});
