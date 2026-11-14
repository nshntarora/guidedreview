import { validSession } from "../review/sessionSchema";
import type { AnnotateReviewStreamEvent, ParsedDiff, ReviewContext } from "@guided-review/core";
import type { ReviewHost, StreamPlanHandlers } from "@guided-review/ui/review/host";
import { DEFAULT_DIFF_VIEW_MODE, type DiffViewMode } from "@guided-review/ui/review/diffView";

export function createLocalReviewHost(options: {
  onConnectProvider: () => void;
  onGeneratePlan?: () => void;
  onPersistenceError?: (message: string | null) => void;
  onStale?: () => void;
}) {
  const { onConnectProvider } = options;

  const unreadable = new Set<string>();
  const metadata = new Map<string, { diffHash: string; legacySessionKey: string }>();
  const pending = new Map<string, string>();
  const queues = new Map<string, Promise<void>>();
  const url = (key: string) => `/api/review-state?${new URLSearchParams({ key })}`;
  const browserKey = (key: string) => `guidedReview.session.${key}`;
  async function write(key: string): Promise<void> {
    while (pending.has(key)) {
      const body = pending.get(key)!;
      const res = await fetch(url(key), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body,
      });
      if (!res.ok)
        throw new Error(
          "Could not save this review. Check the local server and Git directory permissions, then switch scope or reload to retry. Notes remain in this tab.",
        );
      if (pending.get(key) === body) {
        pending.delete(key);
        try {
          sessionStorage.removeItem(browserKey(key));
        } catch {
          /* Best effort. */
        }
      }
    }
    options.onPersistenceError?.(null);
  }
  const host: ReviewHost = {
    kind: "local",
    generatePlan: options.onGeneratePlan,
    assetUrl: (path) => `/${path.replace(/^\/+/, "")}`,
    persistSession: async (key, data) => {
      const meta = metadata.get(key);
      if (!meta) return;
      if (unreadable.has(key))
        throw new Error("Saved review state could not be read. Reload to retry before saving.");
      const body = JSON.stringify({ data, diffHash: meta.diffHash });
      // A tab-local recovery copy survives server/disk errors without dropping notes.
      try {
        sessionStorage.setItem(browserKey(key), body);
      } catch {
        /* Disk remains primary. */
      }
      pending.set(key, body);
      const next = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(() => write(key));
      queues.set(key, next);
      try {
        await next;
      } catch (error) {
        options.onPersistenceError?.(
          error instanceof Error
            ? error.message
            : "Could not save this review. Notes remain in this tab.",
        );
        throw error;
      }
    },
    restoreSession: async (key) => {
      unreadable.add(key);
      let res: Response;
      try {
        res = await fetch(url(key));
      } catch {
        options.onPersistenceError?.(
          "Could not load saved review state. Reload to retry; saving is paused to preserve existing notes.",
        );
        throw new Error("Could not load saved review state.");
      }
      if (!res.ok) {
        unreadable.add(key);
        options.onPersistenceError?.(
          "Could not load saved review state. Reload to retry; saving is paused to preserve existing notes.",
        );
        throw new Error("Could not load saved review state.");
      }
      unreadable.delete(key);
      const saved = (await res.json()) as { data: unknown; diffHash: string } | null;
      const meta = metadata.get(key);
      if (!meta) return null;
      let recovery: { data: unknown; diffHash: string } | null = null;
      try {
        const raw = sessionStorage.getItem(browserKey(key));
        if (raw) recovery = JSON.parse(raw) as typeof recovery;
      } catch {
        /* Try the disk session or legacy key. */
      }
      // Recovery copies are removed after acknowledged saves, so any remaining copy
      // may contain notes that the server never received.
      const restored = recovery && validSession(recovery.data) ? recovery : saved;
      if (restored) {
        if (restored.diffHash !== meta.diffHash) options.onStale?.();
        meta.diffHash = restored.diffHash;
        return restored.data;
      }
      const raw = sessionStorage.getItem(browserKey(meta.legacySessionKey));
      if (!raw) return null;
      const data: unknown = JSON.parse(raw);
      if (!validSession(data)) return null;
      try {
        await host.persistSession(key, data);
      } catch {
        /* Keep the legacy copy and restore notes in memory. */
      }
      return data;
    },
    clearSession: async (key) => {
      pending.delete(key);
      await queues.get(key)?.catch(() => {});
      const res = await fetch(url(key), { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete saved review state.");
      sessionStorage.removeItem(browserKey(key));
      const legacy = metadata.get(key)?.legacySessionKey;
      if (legacy) sessionStorage.removeItem(browserKey(legacy));
    },
    streamPlan: (_diff: ParsedDiff, _context: ReviewContext, handlers: StreamPlanHandlers) => {
      const source = new EventSource("/api/plan");
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        source.close();
        fn();
      };
      source.onmessage = (event) => {
        let message: AnnotateReviewStreamEvent;
        try {
          message = JSON.parse(event.data) as AnnotateReviewStreamEvent;
        } catch {
          finish(() =>
            handlers.onError({ message: "The local review server sent an unreadable response." }),
          );
          return;
        }
        switch (message.type) {
          case "USAGE":
            handlers.onUsage?.(message.usage);
            return;
          case "STATUS":
            handlers.onStatus?.(message.phase);
            return;
          case "UNIT":
            handlers.onUnit(message.unit);
            return;
          case "DONE":
            finish(() => handlers.onDone(message.plan));
            return;
          case "ERROR":
            finish(() => handlers.onError(message.error));
            return;
        }
      };
      source.onerror = () => {
        finish(() => handlers.onError({ message: "Lost connection to the local review server." }));
      };
      return {
        cancel: () => finish(() => {}),
      };
    },
    connectProvider: onConnectProvider,
    persistDiffViewMode: async (mode: DiffViewMode) => {
      localStorage.setItem("guidedReview.diffViewMode", mode);
    },
    readDiffViewMode: async () => {
      const raw = localStorage.getItem("guidedReview.diffViewMode");
      return raw === "unified" || raw === "split" ? raw : DEFAULT_DIFF_VIEW_MODE;
    },
    filePreviewUrl: async ({ path, side }) => {
      const params = new URLSearchParams({ path, side });
      return `/api/file?${params.toString()}`;
    },
    // Capability flag only — Overlay owns Generate Prompt UI + clipboard.
    exportNotes: () => {},
  };
  return {
    ...host,
    configureSession(session: { sessionKey: string; diffHash: string; legacySessionKey: string }) {
      metadata.set(session.sessionKey, {
        diffHash: session.diffHash,
        legacySessionKey: session.legacySessionKey,
      });
    },
    async flushSessions() {
      await Promise.all([...queues.values()]);
    },
    flushOnUnload() {
      for (const [key, body] of pending) {
        navigator.sendBeacon(url(key), new Blob([body], { type: "application/json" }));
      }
    },
  };
}
