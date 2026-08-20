import { describe, expect, it } from "vitest";
import { parseProviderHttpError } from "./http";

function jsonResponse(status: number, body: unknown, statusText = "Error"): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "content-type": "application/json" },
  });
}

describe("parseProviderHttpError", () => {
  it("parses OpenAI-compatible error bodies", async () => {
    const detail = await parseProviderHttpError(
      jsonResponse(401, {
        error: {
          message: "Incorrect API key provided",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      }),
    );
    expect(detail).toEqual({
      message: "Incorrect API key provided",
      code: "invalid_api_key",
    });
  });

  it("falls back to error.type when code is missing (Anthropic-style)", async () => {
    const detail = await parseProviderHttpError(
      jsonResponse(401, {
        type: "error",
        error: {
          type: "authentication_error",
          message: "invalid x-api-key",
        },
      }),
    );
    expect(detail).toEqual({
      message: "invalid x-api-key",
      code: "authentication_error",
    });
  });

  it("uses statusText when the body is not JSON", async () => {
    const response = new Response("not json", {
      status: 502,
      statusText: "Bad Gateway",
    });
    const detail = await parseProviderHttpError(response);
    expect(detail).toEqual({ message: "Bad Gateway" });
  });

  it("uses a status fallback when body and statusText are empty", async () => {
    const response = new Response(null, { status: 500, statusText: "" });
    const detail = await parseProviderHttpError(response);
    expect(detail.message).toMatch(/500|HTTP/);
  });
});
