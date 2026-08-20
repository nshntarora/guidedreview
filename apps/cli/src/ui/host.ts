import type { AnnotateReviewStreamEvent, ParsedDiff, ReviewContext } from "@guided-review/core";
import type { ReviewHost, StreamPlanHandlers } from "@extension/content/overlay/host";
import type { DiffViewMode } from "@extension/content/overlay/diffView";

function api(path: string, token: string): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("token", token);
  return url.toString();
}

export function createLocalReviewHost(options: {
  token: string;
  onConnectProvider: () => void;
}): ReviewHost {
  const { token, onConnectProvider } = options;

  return {
    kind: "local",
    assetUrl: (path) => `/${path.replace(/^\/+/, "")}`,
    persistSession: async (key, data) => {
      sessionStorage.setItem(`guidedReview.session.${key}`, JSON.stringify(data));
    },
    restoreSession: async (key) => {
      const raw = sessionStorage.getItem(`guidedReview.session.${key}`);
      return raw ? (JSON.parse(raw) as unknown) : null;
    },
    streamPlan: (_diff: ParsedDiff, _context: ReviewContext, handlers: StreamPlanHandlers) => {
      const source = new EventSource(api("/api/plan", token));
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
      return raw === "unified" || raw === "split" ? raw : "split";
    },
    // Capability flag only — Overlay owns Generate Prompt UI + clipboard.
    exportNotes: () => {},
  };
}
