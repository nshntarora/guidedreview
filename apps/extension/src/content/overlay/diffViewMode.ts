import { readLocal, writeLocal } from "../../lib/storage";

export type DiffViewMode = "unified" | "split";

export const DEFAULT_DIFF_VIEW_MODE: DiffViewMode = "split";

const STORAGE_KEY = "guidedReview.diffViewMode";

function parseMode(raw: unknown): DiffViewMode {
  return raw === "unified" || raw === "split" ? raw : DEFAULT_DIFF_VIEW_MODE;
}

/**
 * Read the saved diff view mode. Best-effort: a failed read falls back to the
 * default rather than blocking the overlay from rendering.
 */
export async function getStoredDiffViewMode(): Promise<DiffViewMode> {
  try {
    return await readLocal(STORAGE_KEY, parseMode);
  } catch (error) {
    console.warn(`Guided Review: failed to read ${STORAGE_KEY}`, error);
    return DEFAULT_DIFF_VIEW_MODE;
  }
}

/** Persist the diff view mode. Failures are non-fatal. */
export async function setStoredDiffViewMode(mode: DiffViewMode): Promise<void> {
  try {
    await writeLocal(STORAGE_KEY, mode);
  } catch (error) {
    console.warn(`Guided Review: failed to persist ${STORAGE_KEY}`, error);
  }
}
