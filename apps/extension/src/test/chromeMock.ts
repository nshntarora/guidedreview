import { vi } from "vitest";

/**
 * Minimal in-memory stand-in for the `chrome.*` MV3 APIs this extension
 * touches. Real `chrome.storage.*` is promise-based (as used throughout the
 * codebase), so this mirrors that rather than the older callback style.
 */
type StorageChanges = Record<string, { oldValue?: unknown; newValue?: unknown }>;

function createStorageArea(
  areaName: string,
  emitChanged: (changes: StorageChanges, areaName: string) => void,
) {
  let store: Record<string, unknown> = {};

  return {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys == null) return { ...store };
      const keyList =
        typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const result: Record<string, unknown> = {};
      for (const key of keyList) {
        if (key in store) result[key] = store[key];
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      const changes: StorageChanges = {};
      for (const [key, newValue] of Object.entries(items)) {
        changes[key] = { oldValue: store[key], newValue };
      }
      store = { ...store, ...items };
      emitChanged(changes, areaName);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const changes: StorageChanges = {};
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        changes[key] = { oldValue: store[key] };
        delete store[key];
      }
      emitChanged(changes, areaName);
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
    (
      message: unknown,
      sender: unknown,
      sendResponse: (response?: unknown) => void,
    ) => boolean | void
  >();

  const onConnectListeners = new Set<(port: MockPort) => void>();
  const onInstalledListeners = new Set<(details: { reason: string }) => void>();

  function createPort(name: string): MockPort {
    const onMessage = new Set<(message: unknown) => void>();
    const onDisconnect = new Set<() => void>();
    let disconnected = false;

    const port: MockPort = {
      name,
      sender: { id: MOCK_EXTENSION_ID },
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

  const onChangedListeners = new Set<(changes: StorageChanges, areaName: string) => void>();
  const emitChanged = (changes: StorageChanges, areaName: string): void => {
    for (const listener of onChangedListeners) listener(changes, areaName);
  };

  return {
    storage: {
      local: createStorageArea("local", emitChanged),
      session: createStorageArea("session", emitChanged),
      onChanged: {
        addListener: vi.fn((listener: (changes: StorageChanges, areaName: string) => void) => {
          onChangedListeners.add(listener);
        }),
        removeListener: vi.fn((listener: (changes: StorageChanges, areaName: string) => void) => {
          onChangedListeners.delete(listener);
        }),
        __listeners: onChangedListeners,
      },
    },
    runtime: {
      id: MOCK_EXTENSION_ID,
      sendMessage: vi.fn(async (_message: unknown) => undefined),
      connect: vi.fn((info?: { name?: string }) => {
        const port = createPort(info?.name ?? "");
        for (const listener of onConnectListeners) listener(port);
        return port;
      }),
      getURL: vi.fn((path: string) => path),
      getManifest: vi.fn(() => ({
        manifest_version: 3,
        name: "Guided Review",
        version: "0.2.0",
      })),
      openOptionsPage: vi.fn(),
      lastError: undefined as { message?: string } | undefined,
      onMessage: {
        addListener: vi.fn(
          (listener: typeof onMessageListeners extends Set<infer L> ? L : never) => {
            onMessageListeners.add(listener);
          },
        ),
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
      onInstalled: {
        addListener: vi.fn((listener: (details: { reason: string }) => void) => {
          onInstalledListeners.add(listener);
        }),
        removeListener: vi.fn((listener: (details: { reason: string }) => void) => {
          onInstalledListeners.delete(listener);
        }),
        __listeners: onInstalledListeners,
      },
    },
    action: {
      onClicked: {
        addListener: vi.fn(),
      },
      getUserSettings: vi.fn(async () => ({ isOnToolbar: false })),
    },
    tabs: {
      sendMessage: vi.fn(async (_tabId: number, _message: unknown) => undefined),
      query: vi.fn(async (_query: unknown) => []),
      create: vi.fn(async (_createProperties: unknown) => ({ id: 1 })),
    },
  };
}

/** Extension id the mock reports, so sender checks in the worker can pass. */
export const MOCK_EXTENSION_ID = "guidedreviewmockextensionidaaaaaa";

export interface MockPort {
  name: string;
  /** Present on real ports; the worker rejects ports from other extensions. */
  sender: { id: string };
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
