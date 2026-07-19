import { vi } from "vitest";

/**
 * Minimal in-memory stand-in for the `chrome.*` MV3 APIs this extension
 * touches. Real `chrome.storage.*` is promise-based (as used throughout the
 * codebase), so this mirrors that rather than the older callback style.
 */
function createStorageArea() {
  let store: Record<string, unknown> = {};

  return {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys == null) return { ...store };
      const keyList = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const result: Record<string, unknown> = {};
      for (const key of keyList) {
        if (key in store) result[key] = store[key];
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      store = { ...store, ...items };
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete store[key];
      }
    }),
    clear: vi.fn(async () => {
      store = {};
    }),
    setAccessLevel: vi.fn(async () => {}),
    /** Test-only escape hatch to inspect/seed the backing store directly. */
    __getStore: () => store,
  };
}

export function createChromeMock() {
  const onMessageListeners = new Set<
    (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void
  >();

  return {
    storage: {
      local: createStorageArea(),
      session: createStorageArea(),
    },
    runtime: {
      sendMessage: vi.fn(async (_message: unknown) => undefined),
      openOptionsPage: vi.fn(),
      onMessage: {
        addListener: vi.fn((listener: (typeof onMessageListeners extends Set<infer L> ? L : never)) => {
          onMessageListeners.add(listener);
        }),
        removeListener: vi.fn((listener: Parameters<typeof onMessageListeners.add>[0]) => {
          onMessageListeners.delete(listener);
        }),
        __listeners: onMessageListeners,
      },
    },
    action: {
      onClicked: {
        addListener: vi.fn(),
      },
    },
  };
}

export type ChromeMock = ReturnType<typeof createChromeMock>;
