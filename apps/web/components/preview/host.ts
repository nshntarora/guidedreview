import { DEFAULT_DIFF_VIEW_MODE } from "@guided-review/ui/review/diffView";
import { useReviewStore } from "@guided-review/ui/review/store";
import type { ReviewHost } from "@guided-review/ui/review";
import { sampleContext, sampleDiff, sampleLocalContext, samplePlan } from "./sample";

export type PreviewMode = "cli" | "chrome";

export function createPreviewHost(
  mode: PreviewMode,
  onModeChange: (mode: PreviewMode) => void,
  onUnsupported: (feature: string) => void,
): ReviewHost {
  return {
    kind: mode === "cli" ? "local" : "github",
    preview: { mode, onModeChange },
    assetUrl: () => "/assets/logomark.svg",
    persistSession: async () => {},
    restoreSession: async () => null,
    readDiffViewMode: async () => DEFAULT_DIFF_VIEW_MODE,
    generatePlan: () => {
      const state = useReviewStore.getState();
      const generation = state.beginRetry();
      queueMicrotask(() => useReviewStore.getState().setReady(sampleDiff, samplePlan, generation));
    },
    connectProvider: () => onUnsupported("Provider settings"),
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
    ...(mode === "cli"
      ? { exportNotes: () => {} }
      : {
          submit: {
            getAuthStatus: async () => ({ ok: true, auth: { login: "sample-reviewer" } }),
            submitReview: async () => ({ ok: true, reviewId: 0, htmlUrl: "" }),
          },
        }),
  };
}

export function loadPreviewReview(mode: PreviewMode) {
  return {
    context: mode === "cli" ? sampleLocalContext : sampleContext,
    diff: sampleDiff,
    plan: samplePlan,
  };
}
