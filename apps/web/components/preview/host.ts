import type { ReviewHost } from "@guided-review/ui/review";
import { sampleContext, sampleDiff, samplePlan } from "./sample";

export function createPreviewHost(): ReviewHost {
  return {
    kind: "preview",
    assetUrl: () => "/assets/logomark.svg",
    persistSession: async () => {},
    restoreSession: async () => null,
    readDiffViewMode: async () =>
      window.matchMedia("(min-width: 768px)").matches ? "split" : "unified",
    connectProvider: () => {},
    streamPlan: (_diff, _context, handlers) => {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) handlers.onDone(samplePlan);
      });
      return {
        cancel: () => {
          cancelled = true;
        },
      };
    },
    submit: {
      getAuthStatus: async () => ({ ok: true, auth: { login: "sample-reviewer" } }),
      submitReview: async () => ({ ok: true, reviewId: 0, htmlUrl: "" }),
    },
  };
}

export function loadPreviewReview() {
  return { context: sampleContext, diff: sampleDiff, plan: samplePlan };
}
