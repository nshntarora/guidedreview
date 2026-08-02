import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DIFF_VIEW_MODE,
  getAutoOpenOnFilesTab,
  getStoredDiffViewMode,
  onAutoOpenOnFilesTabChanged,
  setAutoOpenOnFilesTab,
  setStoredDiffViewMode,
} from "./preferences";

describe("autoOpenOnFilesTab", () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  it("defaults to off when nothing is stored", async () => {
    await expect(getAutoOpenOnFilesTab()).resolves.toBe(false);
  });

  it("round-trips a saved value", async () => {
    await setAutoOpenOnFilesTab(true);
    await expect(getAutoOpenOnFilesTab()).resolves.toBe(true);
    await setAutoOpenOnFilesTab(false);
    await expect(getAutoOpenOnFilesTab()).resolves.toBe(false);
  });

  it("ignores invalid stored values", async () => {
    await chrome.storage.local.set({ "guidedReview.autoOpenOnFilesTab": "yes" });
    await expect(getAutoOpenOnFilesTab()).resolves.toBe(false);
  });

  it("onAutoOpenOnFilesTabChanged fires on save", async () => {
    const listener = vi.fn();
    const unsubscribe = onAutoOpenOnFilesTabChanged(listener);

    await setAutoOpenOnFilesTab(true);
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
    await setAutoOpenOnFilesTab(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("onAutoOpenOnFilesTabChanged ignores unrelated keys", async () => {
    const listener = vi.fn();
    const unsubscribe = onAutoOpenOnFilesTabChanged(listener);

    await chrome.storage.local.set({ "guidedReview.somethingElse": 1 });
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("falls back to off and warns when the read fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error("quota"));

    await expect(getAutoOpenOnFilesTab()).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("failed to read guidedReview.autoOpenOnFilesTab"),
      expect.any(Error),
    );
  });

  it("swallows and warns when the write fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error("disk full"));

    await expect(setAutoOpenOnFilesTab(true)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("failed to persist guidedReview.autoOpenOnFilesTab"),
      expect.any(Error),
    );
  });
});

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
