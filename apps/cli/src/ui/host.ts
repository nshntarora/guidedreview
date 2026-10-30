import type { AnnotateReviewStreamEvent, ParsedDiff, ReviewContext } from "@guided-review/core";
import type { ReviewHost, StreamPlanHandlers } from "@guided-review/ui/review/host";
import { DEFAULT_DIFF_VIEW_MODE, type DiffViewMode } from "@guided-review/ui/review/diffView";

export function createLocalReviewHost(options: {
  onConnectProvider: () => void;
  onGeneratePlan?: () => void;
}): ReviewHost {
  const { onConnectProvider } = options;

  return {
    kind: "local",
    generatePlan: options.onGeneratePlan,
    assetUrl: (path) => `/${path.replace(/^\/+/, "")}`,
    persistSession: async (key, data) => {
      sessionStorage.setItem(`guidedReview.session.${key}`, JSON.stringify(data));
    },
    restoreSession: async (key) => {
      const raw = sessionStorage.getItem(`guidedReview.session.${key}`);
      return raw ? (JSON.parse(raw) as unknown) : null;
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
}
