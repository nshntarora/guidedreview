import { describe, expect, it, vi } from "vitest";
import { readLocal, watchLocal, writeLocal } from "./storage";
import type { ChromeMock } from "../test/chromeMock";

function chromeMock(): ChromeMock {
  return chrome as unknown as ChromeMock;
}

describe("readLocal", () => {
  it("parses the stored value for the key", async () => {
    await chrome.storage.local.set({ theme: "dark" });

    const value = await readLocal("theme", (raw) => (typeof raw === "string" ? raw : "light"));
    expect(value).toBe("dark");
  });

  it("passes undefined to parse when the key is missing", async () => {
    const value = await readLocal("missing", (raw) => raw ?? "default");
    expect(value).toBe("default");
  });

  it("falls back to parse(undefined) when storage.get throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error("quota"));

    const value = await readLocal("theme", (raw) => (raw === undefined ? "fallback" : String(raw)));

    expect(value).toBe("fallback");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("failed to read theme"),
      expect.any(Error),
    );
  });
});

describe("writeLocal", () => {
  it("persists the value under the key", async () => {
    await writeLocal("pref", { a: 1 });
    const store = chromeMock().storage.local.__getStore();
    expect(store.pref).toEqual({ a: 1 });
  });

  it("logs and swallows storage.set failures", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error("disk full"));

    await expect(writeLocal("pref", true)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("failed to persist pref"),
      expect.any(Error),
    );
  });
});

describe("watchLocal", () => {
  it("notifies when the watched key changes in local storage", async () => {
    const listener = vi.fn();
    const unsub = watchLocal("theme", (raw) => String(raw ?? "light"), listener);

    await chrome.storage.local.set({ theme: "dark" });

    expect(listener).toHaveBeenCalledWith("dark");
    unsub();
  });

  it("ignores changes for other keys and non-local areas", async () => {
    const listener = vi.fn();
    const unsub = watchLocal("theme", (raw) => raw, listener);

    await chrome.storage.local.set({ other: 1 });
    await chrome.storage.session.set({ theme: "session-only" });

    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it("stops notifying after unsubscribe", async () => {
    const listener = vi.fn();
    const unsub = watchLocal("theme", (raw) => raw, listener);
    unsub();

    await chrome.storage.local.set({ theme: "dark" });
    expect(listener).not.toHaveBeenCalled();
  });
});
