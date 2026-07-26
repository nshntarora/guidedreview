/**
 * Thin helpers over `chrome.storage.local` for the extension's single-key
 * preferences. Each caller supplies a `parse` that turns the raw stored value
 * (possibly `undefined` or stale) into a valid value of its own type.
 */

/**
 * Read one key. Storage failures are logged and fall back to `parse(undefined)`
 * — a preference that can't be read should never break the flow reading it.
 * Callers that need a read failure to surface should call `chrome.storage.local`
 * directly.
 */
export async function readLocal<T>(key: string, parse: (raw: unknown) => T): Promise<T> {
  try {
    const result = await chrome.storage.local.get(key);
    return parse(result[key]);
  } catch (error) {
    console.warn(`Guided Review: failed to read ${key}`, error);
    return parse(undefined);
  }
}

/** Write one key. Failures are non-fatal and logged. */
export async function writeLocal(key: string, value: unknown): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.warn(`Guided Review: failed to persist ${key}`, error);
  }
}

/**
 * Watch one key for changes (e.g. the options page while a PR tab is open).
 * Returns an unsubscribe function.
 */
export function watchLocal<T>(
  key: string,
  parse: (raw: unknown) => T,
  listener: (value: T) => void,
): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== "local") return;
    const change = changes[key];
    if (!change) return;
    listener(parse(change.newValue));
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
