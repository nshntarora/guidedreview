import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_DIFF_VIEW_MODE,
  getStoredDiffViewMode,
  setStoredDiffViewMode,
} from "./diffViewMode";

describe("diffViewMode storage", () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  it("returns the default when nothing is stored", async () => {
    await expect(getStoredDiffViewMode()).resolves.toBe(DEFAULT_DIFF_VIEW_MODE);
  });

  it("round-trips a saved mode", async () => {
    await setStoredDiffViewMode("split");
    await expect(getStoredDiffViewMode()).resolves.toBe("split");
  });

  it("ignores invalid stored values", async () => {
    await chrome.storage.local.set({ "guidedReview.diffViewMode": "sideways" });
    await expect(getStoredDiffViewMode()).resolves.toBe(DEFAULT_DIFF_VIEW_MODE);
  });
});
