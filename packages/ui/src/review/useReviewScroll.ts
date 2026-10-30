import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { useReviewStore } from "./store";

/** Save reading positions after scrolling settles, and before leaving a selection. */
export function useReviewScroll(
  containerRef: RefObject<HTMLElement | null>,
  contentKey: string,
  sessionKey: string | null,
  isOpen: boolean,
) {
  const flushRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!isOpen || !container) return;
    const generation = useReviewStore.getState().streamGeneration;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingTop: number | undefined;
    const flush = () => {
      clearTimeout(timer);
      const state = useReviewStore.getState();
      const obsoleteUnit = contentKey.startsWith("unit:") && state.streamGeneration !== generation;
      if (pendingTop !== undefined && state.sessionKey === sessionKey && !obsoleteUnit) {
        state.saveScrollPosition(contentKey, pendingTop);
      }
      pendingTop = undefined;
    };
    flushRef.current = flush;
    const onScroll = () => {
      pendingTop = container.scrollTop;
      clearTimeout(timer);
      timer = setTimeout(flush, 150);
    };
    container.addEventListener("scroll", onScroll);
    return () => {
      container.removeEventListener("scroll", onScroll);
      flush();
      flushRef.current = () => {};
    };
  }, [containerRef, contentKey, sessionKey, isOpen]);

  return useCallback(() => flushRef.current(), []);
}
