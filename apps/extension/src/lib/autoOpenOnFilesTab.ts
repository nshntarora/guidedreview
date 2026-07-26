import { readLocal, watchLocal, writeLocal } from "./storage";

const STORAGE_KEY = "guidedReview.autoOpenOnFilesTab";

/** Default: off — opt-in so the overlay never surprises first-time users. */
function parseEnabled(raw: unknown): boolean {
  return typeof raw === "boolean" ? raw : false;
}

/** Read whether Guided Review should open on the Files changed / Changes tab. */
export function getAutoOpenOnFilesTab(): Promise<boolean> {
  return readLocal(STORAGE_KEY, parseEnabled);
}

/** Persist the auto-open preference. Failures are non-fatal. */
export function setAutoOpenOnFilesTab(enabled: boolean): Promise<void> {
  return writeLocal(STORAGE_KEY, enabled);
}

/**
 * Watch for changes to the auto-open preference (e.g. options page while a
 * PR tab is open). Returns an unsubscribe function.
 */
export function onAutoOpenOnFilesTabChanged(listener: (enabled: boolean) => void): () => void {
  return watchLocal(STORAGE_KEY, parseEnabled, listener);
}
