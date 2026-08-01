import { describe, expect, it, vi } from "vitest";
import {
  readLocal,
  readSession,
  removeLocal,
  watchLocal,
  writeLocal,
  writeSession,
} from "./storage";
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

  // Failures propagate so a read error can never be mistaken for "not
  // configured". Best-effort preferences catch and fall back themselves.
  it("propagates storage.get failures", async () => {
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error("quota"));

    await expect(readLocal("theme", (raw) => raw)).rejects.toThrow("quota");
  });
});

describe("writeLocal", () => {
  it("persists the value under the key", async () => {
    await writeLocal("pref", { a: 1 });
    const store = chromeMock().storage.local.__getStore();
    expect(store.pref).toEqual({ a: 1 });
  });

  it("propagates storage.set failures", async () => {
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error("disk full"));

    await expect(writeLocal("pref", true)).rejects.toThrow("disk full");
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

describe("removeLocal", () => {
  it("deletes the key", async () => {
    await writeLocal("pref", { a: 1 });
    await removeLocal("pref");

    const store = chromeMock().storage.local.__getStore();
    expect(store.pref).toBeUndefined();
  });
});

describe("session storage", () => {
  it("round-trips a value through the session area", async () => {
    await writeSession("draft", { body: "hi" });

    const value = await readSession("draft", (raw) => raw as { body: string } | undefined);
    expect(value).toEqual({ body: "hi" });
  });

  it("is a separate area from local", async () => {
    await writeLocal("shared", "local-value");
    await writeSession("shared", "session-value");

    expect(await readLocal("shared", (raw) => raw)).toBe("local-value");
    expect(await readSession("shared", (raw) => raw)).toBe("session-value");
  });
});
