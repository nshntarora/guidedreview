import { readLocal, watchLocal, writeLocal } from "./storage";

const STORAGE_KEY = "guidedReview.autoOpenOnFilesTab";

/** Default: off — opt-in so the overlay never surprises first-time users. */
function parseEnabled(raw: unknown): boolean {
  return typeof raw === "boolean" ? raw : false;
}

/**
 * Read whether Guided Review should open on the Files changed / Changes tab.
 * Best-effort: a preference that can't be read must not break the page it
 * would have affected, so a failed read falls back to off.
 */
export async function getAutoOpenOnFilesTab(): Promise<boolean> {
  try {
    return await readLocal(STORAGE_KEY, parseEnabled);
  } catch (error) {
    console.warn(`Guided Review: failed to read ${STORAGE_KEY}`, error);
    return false;
  }
}

/** Persist the auto-open preference. Failures are non-fatal. */
export async function setAutoOpenOnFilesTab(enabled: boolean): Promise<void> {
  try {
    await writeLocal(STORAGE_KEY, enabled);
  } catch (error) {
    console.warn(`Guided Review: failed to persist ${STORAGE_KEY}`, error);
  }
}

/**
 * Watch for changes to the auto-open preference (e.g. options page while a
 * PR tab is open). Returns an unsubscribe function.
 */
export function onAutoOpenOnFilesTabChanged(listener: (enabled: boolean) => void): () => void {
  return watchLocal(STORAGE_KEY, parseEnabled, listener);
}
