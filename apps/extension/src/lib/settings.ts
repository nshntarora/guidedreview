import type { ProviderSettings } from "./types";
import { defaultModelFor, normalizeProviderSettings } from "./providers/catalog";
import { watchLocal } from "./storage";

const STORAGE_KEY = "guidedReview.providerSettings";

const FALLBACK_SETTINGS: ProviderSettings = {
  provider: "anthropic",
  model: defaultModelFor("anthropic"),
  apiKey: "",
};

function parseSettings(raw: unknown): ProviderSettings {
  if (!raw) return FALLBACK_SETTINGS;
  return normalizeProviderSettings(raw as Partial<ProviderSettings>);
}

// Both accessors below deliberately skip the swallow-and-warn helpers in
// `storage.ts`: a failed read must not look like "no API key configured", and
// the options page reports a failed save to the user. Only the change listener
// is shared.

/** Read the user's configured provider settings from chrome.storage.local. */
export async function getProviderSettings(): Promise<ProviderSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return parseSettings(result[STORAGE_KEY]);
}

export async function setProviderSettings(settings: ProviderSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

/**
 * Watch for provider settings changes (e.g. the user saving a key in the
 * options tab while the overlay is open). Returns an unsubscribe function.
 */
export function onProviderSettingsChanged(
  listener: (settings: ProviderSettings) => void,
): () => void {
  return watchLocal(STORAGE_KEY, parseSettings, listener);
}
