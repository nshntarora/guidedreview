import { useEffect, useRef } from "react";
import { useReviewStore, persistSession } from "./store";
import { resolveUnitFiles } from "./selectors";
import { buildDisplayUnits, displayUnitCount } from "./displayUnits";
import { ProgressHeader } from "./components/ProgressHeader";
import { Sidebar } from "./components/Sidebar";
import { DiffPane } from "./components/DiffPane";
import { DescriptionPane } from "./components/DescriptionPane";
import { ContextPanel } from "./components/ContextPanel";
import { FooterNav } from "./components/FooterNav";

interface OverlayProps {
  prUrl: string;
  /** Invoked when the user exits so any in-flight stream can be cancelled. */
  onRequestClose?: () => void;
}

export function Overlay({ prUrl, onRequestClose }: OverlayProps) {
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

  const handleExit = () => {
    onRequestClose?.();
    close();
  };

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
          onRequestClose?.();
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
  }, [isOpen, onRequestClose]);

  if (!isOpen) return null;

  const stillBuilding = status === "loading" || status === "streaming" || status === "idle";
  // Spinner on the description unit only while the plan is still being built.
  const showBuildingSpinner = stillBuilding && (!plan || currentUnitIndex === 0);
  const displayUnits = buildDisplayUnits(plan);
  const total = displayUnitCount(plan);
  const totalKnown = status === "ready";
  const currentDisplay = displayUnits[currentUnitIndex] ?? displayUnits[0];
  const isDescriptionUnit = !currentDisplay || currentDisplay.kind === "pr_description";
  const currentReviewUnit =
    currentDisplay?.kind === "review" ? currentDisplay.unit : null;
  const resolvedFiles =
    currentReviewUnit && diff ? resolveUnitFiles(currentReviewUnit, diff) : [];

  return (
    <div className="gr-root">
      <ProgressHeader
        currentIndex={currentUnitIndex}
        total={total}
        totalKnown={totalKnown}
        prContext={prContext}
        diff={diff}
        onExit={handleExit}
      />

      <div className="gr-body">
        <main className="gr-code-col" ref={codeColRef}>
          {isDescriptionUnit ? (
            <DescriptionPane prContext={prContext} diff={diff} />
          ) : (
            <DiffPane files={resolvedFiles} />
          )}
        </main>

        <aside className="gr-review-col">
          <div className="gr-context-pane">
            <ContextPanel
              unit={currentReviewUnit}
              hasTitle={Boolean(prContext?.title?.trim())}
              hasDescription={Boolean(
                prContext?.description?.trim() || prContext?.descriptionHtml?.trim()
              )}
              error={status === "error" ? error : null}
              loading={showBuildingSpinner && isDescriptionUnit}
            />
          </div>
          <Sidebar
            plan={plan}
            currentUnitIndex={currentUnitIndex}
            stillBuilding={stillBuilding}
            onSelectUnit={goToUnit}
          />
        </aside>
      </div>

      <FooterNav
        currentIndex={currentUnitIndex}
        total={total}
        onPrev={goPrev}
        onNext={goNext}
      />
    </div>
  );
}
