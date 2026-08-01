import { describe, expect, it } from "vitest";
import { anthropicProvider } from "./anthropic";
import { getProviderClient } from "./index";

describe("getProviderClient", () => {
  it("returns the Anthropic client for anthropic", () => {
    expect(getProviderClient("anthropic")).toBe(anthropicProvider);
  });

  it("returns distinct OpenAI-compatible clients for openai and grok", () => {
    const openai = getProviderClient("openai");
    const grok = getProviderClient("grok");

    expect(openai).not.toBe(anthropicProvider);
    expect(grok).not.toBe(anthropicProvider);
    expect(openai).not.toBe(grok);
    expect(typeof openai.annotateReviewStream).toBe("function");
    expect(typeof openai.testConnection).toBe("function");
    expect(typeof grok.annotateReviewStream).toBe("function");
    expect(typeof grok.testConnection).toBe("function");
  });

  it("returns a stable client instance per provider id", () => {
    expect(getProviderClient("openai")).toBe(getProviderClient("openai"));
    expect(getProviderClient("grok")).toBe(getProviderClient("grok"));
    expect(getProviderClient("anthropic")).toBe(getProviderClient("anthropic"));
  });
});
