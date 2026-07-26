import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODELS,
  defaultModelFor,
  getModel,
  getProvider,
  isKnownProvider,
  modelsForProvider,
  MODELS,
  normalizeProviderSettings,
  PROVIDERS,
  resolveModelForProvider,
} from "./catalog";

describe("provider catalog", () => {
  it("lists the three built-in providers", () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(["anthropic", "openai", "grok"]);
  });

  it("exposes a default model for every provider that exists in MODELS", () => {
    for (const provider of PROVIDERS) {
      const model = getModel(provider.defaultModelId);
      expect(model, `default for ${provider.id}`).toBeDefined();
      expect(model!.provider).toBe(provider.id);
      expect(DEFAULT_MODELS[provider.id]).toBe(provider.defaultModelId);
      expect(defaultModelFor(provider.id)).toBe(provider.defaultModelId);
    }
  });

  it("returns only models for the requested provider", () => {
    const openai = modelsForProvider("openai");
    expect(openai.length).toBeGreaterThan(1);
    expect(openai.every((m) => m.provider === "openai")).toBe(true);
    expect(openai.some((m) => m.id === "gpt-4.1")).toBe(true);
  });

  it("narrows known provider ids", () => {
    expect(isKnownProvider("anthropic")).toBe(true);
    expect(isKnownProvider("gemini")).toBe(false);
  });

  it("looks up providers and models by id", () => {
    expect(getProvider("grok").displayName).toContain("Grok");
    expect(getModel("claude-opus-4-8")?.displayName).toBe("Claude Opus 4.8");
    expect(getModel("does-not-exist")).toBeUndefined();
  });

  it("resolves stale model ids to the provider default", () => {
    expect(resolveModelForProvider("openai", "gpt-4.1")).toBe("gpt-4.1");
    expect(resolveModelForProvider("openai", "retired-model")).toBe(DEFAULT_MODELS.openai);
    expect(resolveModelForProvider("anthropic", "gpt-4.1")).toBe(DEFAULT_MODELS.anthropic);
    expect(resolveModelForProvider("grok", undefined)).toBe(DEFAULT_MODELS.grok);
  });

  it("normalizes partial stored settings", () => {
    expect(normalizeProviderSettings({})).toEqual({
      provider: "anthropic",
      model: DEFAULT_MODELS.anthropic,
      apiKey: "",
    });
    expect(
      normalizeProviderSettings({ provider: "openai", model: "gone", apiKey: "sk-x" }),
    ).toEqual({
      provider: "openai",
      model: DEFAULT_MODELS.openai,
      apiKey: "sk-x",
    });
    expect(normalizeProviderSettings({ provider: "nope", model: "x" }).provider).toBe("anthropic");
  });

  it("gives every model a non-empty display name", () => {
    for (const model of MODELS) {
      expect(model.displayName.length).toBeGreaterThan(0);
      expect(isKnownProvider(model.provider)).toBe(true);
    }
  });
});
