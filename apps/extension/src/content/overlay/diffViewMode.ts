import { readLocal, writeLocal } from "../../lib/storage";

export type DiffViewMode = "unified" | "split";

export const DEFAULT_DIFF_VIEW_MODE: DiffViewMode = "split";

const STORAGE_KEY = "guidedReview.diffViewMode";

function parseMode(raw: unknown): DiffViewMode {
  return raw === "unified" || raw === "split" ? raw : DEFAULT_DIFF_VIEW_MODE;
}

/** Read the saved diff view mode from chrome.storage.local. */
export function getStoredDiffViewMode(): Promise<DiffViewMode> {
  return readLocal(STORAGE_KEY, parseMode);
}

/** Persist the diff view mode. Failures are non-fatal. */
export function setStoredDiffViewMode(mode: DiffViewMode): Promise<void> {
  return writeLocal(STORAGE_KEY, mode);
}
