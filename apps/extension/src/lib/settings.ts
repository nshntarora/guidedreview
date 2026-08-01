import type { ProviderSettings } from "./types";
import { defaultModelFor, normalizeProviderSettings } from "./providers/catalog";
import { readLocal, watchLocal, writeLocal } from "./storage";

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

/**
 * Read the user's configured provider settings. Storage failures propagate on
 * purpose: a failed read must not look like "no API key configured", and the
 * options page reports a failed save to the user.
 */
export function getProviderSettings(): Promise<ProviderSettings> {
  return readLocal(STORAGE_KEY, parseSettings);
}

export function setProviderSettings(settings: ProviderSettings): Promise<void> {
  return writeLocal(STORAGE_KEY, settings);
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
