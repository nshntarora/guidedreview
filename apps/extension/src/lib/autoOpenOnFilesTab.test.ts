import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAutoOpenOnFilesTab,
  onAutoOpenOnFilesTabChanged,
  setAutoOpenOnFilesTab,
} from "./autoOpenOnFilesTab";

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
});
