"use client";

import { useEffect, useRef, useState } from "react";
import {
  Overlay,
  ReviewHostProvider,
  setActiveReviewHost,
  useReviewStore,
} from "@guided-review/ui/review";
import { createPreviewHost, loadPreviewReview } from "./host";

export default function Preview({ onClose }: { onClose: () => void }) {
  const [host] = useState(createPreviewHost);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    const background = Array.from(document.body.children)
      .filter(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && !node.contains(rootRef.current),
      )
      .map((node) => ({ node, inert: node.inert }));
    background.forEach(({ node }) => {
      node.inert = true;
    });
    document.body.style.overflow = "hidden";
    setActiveReviewHost(host);
    const { context, diff, plan } = loadPreviewReview();
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
      document.body.style.overflow = overflow;
      background.forEach(({ node, inert }) => {
        node.inert = inert;
      });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [host]);

  return (
    <div ref={rootRef} data-review-preview>
      <ReviewHostProvider host={host}>
        <Overlay onRequestClose={onClose} />
      </ReviewHostProvider>
      <aside
        className="fixed bottom-4 left-1/2 z-[2147483001] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-lg"
        aria-label="Preview mode"
        data-testid="preview-mode-notice"
      >
        Chrome extension preview · The CLI uses the same review UI.
      </aside>
    </div>
  );
}
