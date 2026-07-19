import type { ProviderSettings } from "./types";
import { DEFAULT_MODELS } from "./types";
import { normalizeProviderSettings } from "./providers/catalog";

const STORAGE_KEY = "guidedReview.providerSettings";

const FALLBACK_SETTINGS: ProviderSettings = {
  provider: "anthropic",
  model: DEFAULT_MODELS.anthropic,
  apiKey: "",
};

/** Read the user's configured provider settings from chrome.storage.local. */
export async function getProviderSettings(): Promise<ProviderSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<ProviderSettings> | undefined;
  if (!stored) return FALLBACK_SETTINGS;
  return normalizeProviderSettings(stored);
}

export async function setProviderSettings(settings: ProviderSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}
