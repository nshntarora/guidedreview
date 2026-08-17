import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotateReviewInput } from "./types";

vi.mock("./http", () => ({
  postProviderJson: vi.fn(),
}));

import { postProviderJson } from "./http";
import { createOpenAICompatibleProvider } from "./openaiCompatible";

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
  settings: { provider: "openai", model: "gpt-4o", apiKey: "sk-test" },
};

async function collect(
  gen: AsyncGenerator<{ type: string; text?: string }, void, unknown>,
): Promise<Array<{ type: string; text?: string }>> {
  const out: Array<{ type: string; text?: string }> = [];
  for await (const event of gen) out.push(event);
  return out;
}

describe("createOpenAICompatibleProvider", () => {
  const provider = createOpenAICompatibleProvider("https://api.openai.com/v1", "OpenAI");

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
          'data: {"choices":[{"delta":{"content":"{\\"units\\""}}]}\n',
          'data: {"choices":[{"delta":{"content":":[]}"}}]}\n',
          "data: [DONE]\n",
        ),
      ),
    );

    const events = await collect(provider.annotateReviewStream(input));

    expect(postMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      { authorization: "Bearer sk-test" },
      expect.objectContaining({
        model: "gpt-4o",
        stream: true,
        response_format: expect.objectContaining({ type: "json_schema" }),
      }),
      "OpenAI",
      undefined,
    );
    expect(events).toEqual([
      { type: "text_delta", text: '{"units"' },
      { type: "text_delta", text: ":[]}" },
      { type: "done" },
    ]);
  });

  it("emits heartbeats for reasoning tokens without treating them as plan JSON", async () => {
    postMock.mockResolvedValue(
      okStreamResponse(
        streamOf(
          'data: {"choices":[{"delta":{"reasoning_content":"thinking"}}]}\n',
          'data: {"choices":[{"delta":{"content":"{}"}}]}\n',
          "data: [DONE]\n",
        ),
      ),
    );

    const events = await collect(provider.annotateReviewStream(input));
    expect(events).toEqual([
      { type: "heartbeat" },
      { type: "text_delta", text: "{}" },
      { type: "done" },
    ]);
  });

  it("throws when the response body is empty", async () => {
    postMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(collect(provider.annotateReviewStream(input))).rejects.toThrow(
      /OpenAI returned an empty stream/,
    );
  });

  it("throws ProviderError when the stream carries an error object", async () => {
    postMock.mockResolvedValue(
      okStreamResponse(
        streamOf('data: {"error":{"message":"Rate limit exceeded","code":"rate_limit"}}\n'),
      ),
    );

    await expect(collect(provider.annotateReviewStream(input))).rejects.toMatchObject({
      name: "ProviderError",
      message: "Rate limit exceeded",
      code: "rate_limit",
    });
  });

  it("throws when the stream yields no content", async () => {
    postMock.mockResolvedValue(
      okStreamResponse(streamOf('data: {"choices":[{"delta":{}}]}\n', "data: [DONE]\n")),
    );

    await expect(collect(provider.annotateReviewStream(input))).rejects.toThrow(
      /OpenAI returned no content/,
    );
  });

  it("testConnection posts a minimal probe request", async () => {
    postMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await provider.testConnection(input.settings);

    expect(postMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      { authorization: "Bearer sk-test" },
      expect.objectContaining({
        model: "gpt-4o",
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with OK." }],
      }),
      "OpenAI",
    );
  });

  it("uses the configured base URL and display name for Grok", async () => {
    const grok = createOpenAICompatibleProvider("https://api.x.ai/v1", "Grok");
    postMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(collect(grok.annotateReviewStream(input))).rejects.toThrow(
      /Grok returned an empty stream/,
    );
    expect(postMock).toHaveBeenCalledWith(
      "https://api.x.ai/v1/chat/completions",
      expect.any(Object),
      expect.any(Object),
      "Grok",
      undefined,
    );
  });
});
