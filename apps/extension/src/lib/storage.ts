/**
 * The extension's only access to `chrome.storage`. Every read, write, and
 * change subscription goes through here — an ESLint rule enforces it — so the
 * one place that knows about the browser storage API is this file.
 *
 * Each caller supplies a `parse` that turns the raw stored value (possibly
 * `undefined` or stale) into a valid value of its own type.
 *
 * These functions propagate storage failures. Callers holding a best-effort
 * preference should catch and fall back; callers holding real data (API keys,
 * OAuth tokens) must let the failure surface rather than report it as "not
 * configured".
 */

// ---- local: persists across browser restarts (settings, tokens, prefs) ------

export async function readLocal<T>(key: string, parse: (raw: unknown) => T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return parse(result[key]);
}

export async function writeLocal(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function removeLocal(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}

/**
 * Watch one key for changes (e.g. the options page saving while a PR tab is
 * open). Returns an unsubscribe function.
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

// ---- session: cleared when the browser closes (in-progress review state) ----

export async function readSession<T>(key: string, parse: (raw: unknown) => T): Promise<T> {
  const result = await chrome.storage.session.get(key);
  return parse(result[key]);
}

export async function writeSession(key: string, value: unknown): Promise<void> {
  await chrome.storage.session.set({ [key]: value });
}

/**
 * Content scripts cannot touch session storage until the worker grants access.
 * Called once on background startup.
 */
export async function grantSessionAccessToContentScripts(): Promise<void> {
  await chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });
}

/** Store immutable diff data once; progress writes stay small. Writes are ordered
 * and a changed diff and its progress are committed in the same storage call. */
export function createReviewSessionStorage() {
  let lastKey: string | undefined;
  let lastDiff: unknown;
  let pending: Promise<void> = Promise.resolve();
  return {
    write(key: string, value: unknown): Promise<void> {
      const save = async () => {
        if (!value || typeof value !== "object" || !("diff" in value)) {
          throw new Error("Cannot save a review session without a diff.");
        }
        const { diff, ...progress } = value;
        const diffKey = `${key}.diff`;
        const entries: Record<string, unknown> = { [key]: { ...progress, diffKey } };
        if (lastKey !== key || lastDiff !== diff) entries[diffKey] = diff;
        await chrome.storage.session.set(entries);
        lastKey = key;
        lastDiff = diff;
      };
      const result = pending.then(save);
      pending = result.catch(() => {});
      return result;
    },
    async read(key: string): Promise<unknown | null> {
      await pending;
      const diffKey = `${key}.diff`;
      const entries = await chrome.storage.session.get([key, diffKey]);
      const saved = entries[key];
      if (!saved || typeof saved !== "object") return null;
      // Existing full snapshots take precedence, including legacy records.
      if ("diff" in saved) return saved;
      if (!("diffKey" in saved) || saved.diffKey !== diffKey || !entries[diffKey]) return null;
      return { ...saved, diff: entries[diffKey] };
    },
  };
}
