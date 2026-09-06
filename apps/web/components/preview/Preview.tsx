"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@guided-review/ui";
import {
  Overlay,
  ReviewHostProvider,
  setActiveReviewHost,
  useReviewStore,
} from "@guided-review/ui/review";
import type { LocalDiffControls } from "@guided-review/ui/review";
import { createPreviewHost, loadPreviewReview, type PreviewMode } from "./host";

export default function Preview({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<PreviewMode>("cli");
  const [unsupportedFeature, setUnsupportedFeature] = useState<string | null>(null);
  const showUnsupported = useCallback((feature: string) => setUnsupportedFeature(feature), []);
  const host = useMemo(
    () => createPreviewHost(mode, setMode, showUnsupported),
    [mode, showUnsupported],
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const background = Array.from(document.body.children)
      .filter(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && !node.contains(rootRef.current),
      )
      .map((node) => ({ node, inert: node.inert }));
    background.forEach(({ node }) => {
      node.inert = true;
    });
    return () => {
      background.forEach(({ node, inert }) => {
        node.inert = inert;
      });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    setActiveReviewHost(host);
    const { context, diff, plan } = loadPreviewReview(mode);
    const state = useReviewStore.getState();
    const generation = state.startLoading("preview:parcel-http");
    state.setPRContext(context);
    state.setDiffViewMode(window.matchMedia("(min-width: 768px)").matches ? "split" : "unified");
    state.setReady(diff, plan, generation);
    state.open();
    return () => {
      useReviewStore.setState({
        ...useReviewStore.getInitialState(),
        streamGeneration: generation + 1,
      });
      setActiveReviewHost(null);
    };
  }, [host, mode]);

  const localDiff: LocalDiffControls | undefined =
    mode === "cli"
      ? {
          scopes: [
            {
              id: "branch",
              label: "Branch changes",
              description: "main…feat/retry-requests",
              meta: "2 commits · 12 files · +180 −19",
              metaPrefix: "2 commits",
              stat: { files: 12, additions: 180, deletions: 19 },
              empty: false,
            },
          ],
          selectedScope: "branch",
          commits: [
            {
              sha: "82c77b1f07a4",
              shortSha: "82c77b1",
              subject: "Add bounded request retries",
              body: "Add retry policy, backoff, and cancellation across the request lifecycle.",
              author: "Sam Rivera",
              authoredAt: "2026-08-28T10:14:00Z",
              stat: { files: 8, additions: 128, deletions: 11 },
            },
            {
              sha: "e41a90c65df2",
              shortSha: "e41a90c",
              subject: "Cover retry boundaries",
              body: "Exercise policy parsing, jitter, and abort cleanup.",
              author: "Sam Rivera",
              authoredAt: "2026-08-29T08:32:00Z",
              stat: { files: 6, additions: 52, deletions: 8 },
            },
          ],
          onSelectScope: () => showUnsupported("Changing the diff scope"),
          onStructureReview: () => showUnsupported("Structuring a new review"),
          structuring: false,
          structured: true,
        }
      : undefined;

  return (
    <div ref={rootRef} data-review-preview>
      <ReviewHostProvider host={host}>
        <Overlay localDiff={localDiff} onRequestClose={onClose} />
      </ReviewHostProvider>
      {unsupportedFeature &&
        rootRef.current &&
        createPortal(
          <aside
            role="status"
            aria-live="polite"
            data-testid="preview-unsupported-notice"
            className="fixed bottom-4 left-1/2 z-[2147483001] flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-wrap items-center gap-3 rounded-lg border border-warning/50 bg-surface-raised px-4 py-3 text-left shadow-lg"
          >
            <p className="m-0 min-w-0 flex-1 text-base text-foreground">
              <span className="font-semibold text-warning">{unsupportedFeature}</span> isn’t
              available in the live preview. Install Guided Review to use it on a real diff.
            </p>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                window.location.hash = mode === "cli" ? "install-cli" : "install-chrome";
              }}
            >
              Install Guided Review
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Dismiss preview notification"
              onClick={() => setUnsupportedFeature(null)}
            >
              Dismiss
            </Button>
          </aside>,
          rootRef.current.querySelector("[data-testid=guided-review-overlay]") ?? rootRef.current,
        )}
    </div>
  );
}
