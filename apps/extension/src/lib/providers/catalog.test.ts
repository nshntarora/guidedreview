import { describe, expect, it } from "vitest";
import {
  defaultModelFor,
  getProvider,
  modelsForProvider,
  MODELS,
  normalizeProviderSettings,
  PROVIDERS,
} from "./catalog";

describe("provider catalog", () => {
  it("lists the three built-in providers", () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(["anthropic", "openai", "grok"]);
  });

  it("exposes a default model for every provider that exists in MODELS", () => {
    for (const provider of PROVIDERS) {
      const model = MODELS.find((m) => m.id === provider.defaultModelId);
      expect(model, `default for ${provider.id}`).toBeDefined();
      expect(model!.provider).toBe(provider.id);
      expect(defaultModelFor(provider.id)).toBe(provider.defaultModelId);
    }
  });

  it("returns only models for the requested provider", () => {
    const openai = modelsForProvider("openai");
    expect(openai.length).toBeGreaterThan(1);
    expect(openai.every((m) => m.provider === "openai")).toBe(true);
    expect(openai.some((m) => m.id === "gpt-4.1")).toBe(true);
  });

  it("looks up providers by id", () => {
    expect(getProvider("grok").displayName).toContain("Grok");
  });

  it("keeps a stored model that still exists for its provider", () => {
    expect(normalizeProviderSettings({ provider: "openai", model: "gpt-4.1" }).model).toBe(
      "gpt-4.1",
    );
  });

  it("resolves stale, cross-provider and missing model ids to the provider default", () => {
    expect(normalizeProviderSettings({ provider: "openai", model: "retired-model" }).model).toBe(
      defaultModelFor("openai"),
    );
    // A real model id, but belonging to a different provider.
    expect(normalizeProviderSettings({ provider: "anthropic", model: "gpt-4.1" }).model).toBe(
      defaultModelFor("anthropic"),
    );
    expect(normalizeProviderSettings({ provider: "grok" }).model).toBe(defaultModelFor("grok"));
  });

  it("normalizes partial stored settings", () => {
    expect(normalizeProviderSettings({})).toEqual({
      provider: "anthropic",
      model: defaultModelFor("anthropic"),
      apiKey: "",
    });
    expect(
      normalizeProviderSettings({ provider: "openai", model: "gone", apiKey: "sk-x" }),
    ).toEqual({
      provider: "openai",
      model: defaultModelFor("openai"),
      apiKey: "sk-x",
    });
  });

  it("falls back to anthropic for an unrecognized provider id", () => {
    expect(normalizeProviderSettings({ provider: "nope", model: "x" }).provider).toBe("anthropic");
    expect(normalizeProviderSettings({ provider: "gemini" }).provider).toBe("anthropic");
  });

  it("gives every model a non-empty display name and a known provider", () => {
    const knownProviderIds = PROVIDERS.map((p) => p.id);
    for (const model of MODELS) {
      expect(model.displayName.length).toBeGreaterThan(0);
      expect(knownProviderIds).toContain(model.provider);
    }
  });
});
