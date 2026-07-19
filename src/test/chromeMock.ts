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

  const onConnectListeners = new Set<(port: MockPort) => void>();

  function createPort(name: string): MockPort {
    const onMessage = new Set<(message: unknown) => void>();
    const onDisconnect = new Set<() => void>();
    let disconnected = false;

    const port: MockPort = {
      name,
      // Outbound only — does not fan into local onMessage listeners (those are remote events).
      postMessage: vi.fn((_message: unknown) => {}),
      disconnect: vi.fn(() => {
        if (disconnected) return;
        disconnected = true;
        for (const listener of onDisconnect) listener();
      }),
      onMessage: {
        addListener: vi.fn((listener: (message: unknown) => void) => {
          onMessage.add(listener);
        }),
        removeListener: vi.fn((listener: (message: unknown) => void) => {
          onMessage.delete(listener);
        }),
      },
      onDisconnect: {
        addListener: vi.fn((listener: () => void) => {
          onDisconnect.add(listener);
        }),
        removeListener: vi.fn((listener: () => void) => {
          onDisconnect.delete(listener);
        }),
      },
      /** Test helper: deliver a remote message to this port's onMessage listeners. */
      __emitMessage(message: unknown) {
        for (const listener of onMessage) listener(message);
      },
      /** Test helper: fire disconnect listeners. */
      __emitDisconnect() {
        if (disconnected) return;
        disconnected = true;
        for (const listener of onDisconnect) listener();
      },
    };

    return port;
  }

  return {
    storage: {
      local: createStorageArea(),
      session: createStorageArea(),
    },
    runtime: {
      sendMessage: vi.fn(async (_message: unknown) => undefined),
      connect: vi.fn((info?: { name?: string }) => {
        const port = createPort(info?.name ?? "");
        for (const listener of onConnectListeners) listener(port);
        return port;
      }),
      getURL: vi.fn((path: string) => path),
      openOptionsPage: vi.fn(),
      lastError: undefined as { message?: string } | undefined,
      onMessage: {
        addListener: vi.fn((listener: (typeof onMessageListeners extends Set<infer L> ? L : never)) => {
          onMessageListeners.add(listener);
        }),
        removeListener: vi.fn((listener: Parameters<typeof onMessageListeners.add>[0]) => {
          onMessageListeners.delete(listener);
        }),
        __listeners: onMessageListeners,
      },
      onConnect: {
        addListener: vi.fn((listener: (port: MockPort) => void) => {
          onConnectListeners.add(listener);
        }),
        removeListener: vi.fn((listener: (port: MockPort) => void) => {
          onConnectListeners.delete(listener);
        }),
        __listeners: onConnectListeners,
      },
    },
    action: {
      onClicked: {
        addListener: vi.fn(),
      },
    },
  };
}

export interface MockPort {
  name: string;
  postMessage: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  onMessage: {
    addListener: ReturnType<typeof vi.fn>;
    removeListener: ReturnType<typeof vi.fn>;
  };
  onDisconnect: {
    addListener: ReturnType<typeof vi.fn>;
    removeListener: ReturnType<typeof vi.fn>;
  };
  __emitMessage: (message: unknown) => void;
  __emitDisconnect: () => void;
}

export type ChromeMock = ReturnType<typeof createChromeMock>;
