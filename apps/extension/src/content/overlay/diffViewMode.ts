export type DiffViewMode = "unified" | "split";

export const DEFAULT_DIFF_VIEW_MODE: DiffViewMode = "split";

const STORAGE_KEY = "guidedReview.diffViewMode";

function isDiffViewMode(value: unknown): value is DiffViewMode {
  return value === "unified" || value === "split";
}

/** Read the saved diff view mode from chrome.storage.local. */
export async function getStoredDiffViewMode(): Promise<DiffViewMode> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];
    return isDiffViewMode(stored) ? stored : DEFAULT_DIFF_VIEW_MODE;
  } catch {
    return DEFAULT_DIFF_VIEW_MODE;
  }
}

/** Persist the diff view mode. Failures are non-fatal. */
export async function setStoredDiffViewMode(mode: DiffViewMode): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: mode });
  } catch (error) {
    console.warn("Guided Review: failed to persist diff view mode", error);
  }
}
