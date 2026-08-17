import { describe, expect, it, vi } from "vitest";
import { getProviderSettings, onProviderSettingsChanged, setProviderSettings } from "./settings";
import { defaultModelFor } from "@guided-review/core";

describe("settings", () => {
  it("returns fallback settings when nothing is stored", async () => {
    const settings = await getProviderSettings();
    expect(settings).toEqual({
      provider: "anthropic",
      model: defaultModelFor("anthropic"),
      apiKey: "",
    });
  });

  it("round-trips settings through chrome.storage.local", async () => {
    await setProviderSettings({ provider: "openai", model: "gpt-4.1", apiKey: "sk-test" });
    const settings = await getProviderSettings();
    expect(settings).toEqual({ provider: "openai", model: "gpt-4.1", apiKey: "sk-test" });
  });

  it("falls back to the provider's default model when only apiKey/provider are stored", async () => {
    await chrome.storage.local.set({
      "guidedReview.providerSettings": { provider: "grok", apiKey: "x" },
    });
    const settings = await getProviderSettings();
    expect(settings.model).toBe(defaultModelFor("grok"));
  });

  it("onProviderSettingsChanged fires with normalized settings on save", async () => {
    const listener = vi.fn();
    const unsubscribe = onProviderSettingsChanged(listener);

    await setProviderSettings({ provider: "openai", model: "gpt-4.1", apiKey: "sk-new" });

    expect(listener).toHaveBeenCalledWith({
      provider: "openai",
      model: "gpt-4.1",
      apiKey: "sk-new",
    });

    unsubscribe();
    await setProviderSettings({ provider: "openai", model: "gpt-4.1", apiKey: "sk-later" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("onProviderSettingsChanged ignores changes to unrelated keys", async () => {
    const listener = vi.fn();
    const unsubscribe = onProviderSettingsChanged(listener);

    await chrome.storage.local.set({ "guidedReview.somethingElse": 1 });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
