import { describe, expect, it } from "vitest";
import { getProviderSettings, setProviderSettings } from "./settings";
import { DEFAULT_MODELS } from "./types";

describe("settings", () => {
  it("returns fallback settings when nothing is stored", async () => {
    const settings = await getProviderSettings();
    expect(settings).toEqual({ provider: "anthropic", model: DEFAULT_MODELS.anthropic, apiKey: "" });
  });

  it("round-trips settings through chrome.storage.local", async () => {
    await setProviderSettings({ provider: "openai", model: "gpt-4.1", apiKey: "sk-test" });
    const settings = await getProviderSettings();
    expect(settings).toEqual({ provider: "openai", model: "gpt-4.1", apiKey: "sk-test" });
  });

  it("falls back to the provider's default model when only apiKey/provider are stored", async () => {
    await chrome.storage.local.set({ "guidedReview.providerSettings": { provider: "grok", apiKey: "x" } });
    const settings = await getProviderSettings();
    expect(settings.model).toBe(DEFAULT_MODELS.grok);
  });
});
