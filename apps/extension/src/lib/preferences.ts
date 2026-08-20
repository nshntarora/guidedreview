/**
 * Best-effort UI preferences (auto-open, diff view mode). Failures fall back
 * rather than breaking the page — unlike provider settings / OAuth tokens.
 */

import { readLocal, watchLocal, writeLocal } from "./storage";

// ---- Auto-open on Files changed tab ----------------------------------------

const AUTO_OPEN_KEY = "guidedReview.autoOpenOnFilesTab";

function parseAutoOpen(raw: unknown): boolean {
  return typeof raw === "boolean" ? raw : false;
}

/** Read whether Guided Review should open on the Files changed / Changes tab. */
export async function getAutoOpenOnFilesTab(): Promise<boolean> {
  try {
    return await readLocal(AUTO_OPEN_KEY, parseAutoOpen);
  } catch (error) {
    console.warn(`Guided Review: failed to read ${AUTO_OPEN_KEY}`, error);
    return false;
  }
}

/** Persist the auto-open preference. Failures are non-fatal. */
export async function setAutoOpenOnFilesTab(enabled: boolean): Promise<void> {
  try {
    await writeLocal(AUTO_OPEN_KEY, enabled);
  } catch (error) {
    console.warn(`Guided Review: failed to persist ${AUTO_OPEN_KEY}`, error);
  }
}

/**
 * Watch for changes to the auto-open preference (e.g. options page while a
 * PR tab is open). Returns an unsubscribe function.
 */
export function onAutoOpenOnFilesTabChanged(listener: (enabled: boolean) => void): () => void {
  return watchLocal(AUTO_OPEN_KEY, parseAutoOpen, listener);
}

// ---- Diff view mode (unified | split) --------------------------------------

export type { DiffViewMode } from "@extension/content/overlay/diffView";
export { DEFAULT_DIFF_VIEW_MODE } from "@extension/content/overlay/diffView";

import { DEFAULT_DIFF_VIEW_MODE, type DiffViewMode } from "@extension/content/overlay/diffView";

const DIFF_VIEW_MODE_KEY = "guidedReview.diffViewMode";

function parseDiffViewMode(raw: unknown): DiffViewMode {
  return raw === "unified" || raw === "split" ? raw : DEFAULT_DIFF_VIEW_MODE;
}

/** Read the saved diff view mode. Falls back to default on failure. */
export async function getStoredDiffViewMode(): Promise<DiffViewMode> {
  try {
    return await readLocal(DIFF_VIEW_MODE_KEY, parseDiffViewMode);
  } catch (error) {
    console.warn(`Guided Review: failed to read ${DIFF_VIEW_MODE_KEY}`, error);
    return DEFAULT_DIFF_VIEW_MODE;
  }
}

/** Persist the diff view mode. Failures are non-fatal. */
export async function setStoredDiffViewMode(mode: DiffViewMode): Promise<void> {
  try {
    await writeLocal(DIFF_VIEW_MODE_KEY, mode);
  } catch (error) {
    console.warn(`Guided Review: failed to persist ${DIFF_VIEW_MODE_KEY}`, error);
  }
}
