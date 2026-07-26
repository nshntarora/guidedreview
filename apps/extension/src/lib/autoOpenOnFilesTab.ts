const STORAGE_KEY = "guidedReview.autoOpenOnFilesTab";

/** Default: off — opt-in so the overlay never surprises first-time users. */
export const DEFAULT_AUTO_OPEN_ON_FILES_TAB = false;

/** Read whether Guided Review should open on the Files changed / Changes tab. */
export async function getAutoOpenOnFilesTab(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];
    return typeof stored === "boolean" ? stored : DEFAULT_AUTO_OPEN_ON_FILES_TAB;
  } catch {
    return DEFAULT_AUTO_OPEN_ON_FILES_TAB;
  }
}

/** Persist the auto-open preference. Failures are non-fatal. */
export async function setAutoOpenOnFilesTab(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  } catch (error) {
    console.warn("Guided Review: failed to persist auto-open preference", error);
  }
}

/**
 * Watch for changes to the auto-open preference (e.g. options page while a
 * PR tab is open). Returns an unsubscribe function.
 */
export function onAutoOpenOnFilesTabChanged(listener: (enabled: boolean) => void): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== "local") return;
    const change = changes[STORAGE_KEY];
    if (!change) return;
    const next = change.newValue;
    listener(typeof next === "boolean" ? next : DEFAULT_AUTO_OPEN_ON_FILES_TAB);
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
