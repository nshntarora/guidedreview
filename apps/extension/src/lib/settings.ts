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

/**
 * Watch for provider settings changes (e.g. the user saving a key in the
 * options tab while the overlay is open). Returns an unsubscribe function.
 */
export function onProviderSettingsChanged(
  listener: (settings: ProviderSettings) => void,
): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== "local") return;
    const change = changes[STORAGE_KEY];
    if (!change) return;
    const next = change.newValue as Partial<ProviderSettings> | undefined;
    listener(next ? normalizeProviderSettings(next) : FALLBACK_SETTINGS);
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
