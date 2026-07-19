import { useEffect, useRef } from "react";
import { useReviewStore, persistSession } from "./store";
import { resolveUnitFiles } from "./selectors";
import { ProgressHeader } from "./components/ProgressHeader";
import { Sidebar } from "./components/Sidebar";
import { DiffPane } from "./components/DiffPane";
import { ContextPanel } from "./components/ContextPanel";
import { FooterNav } from "./components/FooterNav";

interface OverlayProps {
  prUrl: string;
}

export function Overlay({ prUrl }: OverlayProps) {
  const isOpen = useReviewStore((s) => s.isOpen);
  const status = useReviewStore((s) => s.status);
  const error = useReviewStore((s) => s.error);
  const diff = useReviewStore((s) => s.diff);
  const plan = useReviewStore((s) => s.plan);
  const prContext = useReviewStore((s) => s.prContext);
  const currentUnitIndex = useReviewStore((s) => s.currentUnitIndex);
  const close = useReviewStore((s) => s.close);
  const goToUnit = useReviewStore((s) => s.goToUnit);
  const goNext = useReviewStore((s) => s.goNext);
  const goPrev = useReviewStore((s) => s.goPrev);
  const codeColRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (status === "ready") void persistSession(prUrl);
  }, [prUrl, status, currentUnitIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const SCROLL_STEP = 120;

    // Listen on window in the capture phase so these shortcuts fire before
    // any listener GitHub itself has registered (including its own keyboard
    // shortcut handling), and regardless of which element currently has
    // focus. stopPropagation/preventDefault keep the keystroke from ever
    // reaching the underlying GitHub page.
    function onKeyDown(event: KeyboardEvent): void {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          event.stopPropagation();
          useReviewStore.getState().close();
          return;
        case "ArrowRight":
          event.preventDefault();
          event.stopPropagation();
          useReviewStore.getState().goNext();
          return;
        case "ArrowLeft":
          event.preventDefault();
          event.stopPropagation();
          useReviewStore.getState().goPrev();
          return;
        case "ArrowUp":
          event.preventDefault();
          event.stopPropagation();
          codeColRef.current?.scrollBy({ top: -SCROLL_STEP, behavior: "smooth" });
          return;
        case "ArrowDown":
          event.preventDefault();
          event.stopPropagation();
          codeColRef.current?.scrollBy({ top: SCROLL_STEP, behavior: "smooth" });
          return;
        default:
          return;
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUnit = plan?.units[currentUnitIndex];
  const resolvedFiles = currentUnit && diff ? resolveUnitFiles(currentUnit, diff) : [];

  return (
    <div className="gr-root">
      <ProgressHeader
        currentIndex={currentUnitIndex}
        total={plan?.units.length ?? 0}
        prContext={prContext}
        diff={diff}
        onExit={close}
      />

      <div className="gr-body">
        {(status === "loading" || status === "idle") && (
          <div className="gr-centered">
            <div className="gr-spinner" />
            <p>Reading the diff and building a guided walkthrough…</p>
          </div>
        )}

        {status === "error" && (
          <div className="gr-centered gr-error">
            <p>Something went wrong building the guided review:</p>
            <pre className="gr-error-block">
              <code>{error ?? "Unknown error."}</code>
            </pre>
          </div>
        )}

        {status === "ready" && plan && plan.units.length === 0 && (
          <div className="gr-centered">
            <p>No review units were generated for this diff.</p>
          </div>
        )}

        {status === "ready" && plan && currentUnit && (
          <>
            <main className="gr-code-col" ref={codeColRef}>
              <DiffPane files={resolvedFiles} />
            </main>

            <aside className="gr-review-col">
              <div className="gr-context-pane">
                <ContextPanel unit={currentUnit} />
              </div>
              <Sidebar
                plan={plan}
                currentUnitIndex={currentUnitIndex}
                onSelectUnit={goToUnit}
              />
            </aside>
          </>
        )}
      </div>

      {status === "ready" && plan && plan.units.length > 0 && (
        <FooterNav
          currentIndex={currentUnitIndex}
          total={plan.units.length}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  );
}
