import { useEffect, useMemo, useRef, useState } from "react";
import { useReviewStore, persistSession } from "./store";
import { resolveUnitFiles } from "./selectors";
import { buildDisplayUnits, displayUnitCount } from "./displayUnits";
import { buildSelectableLines } from "./buildSelectableLines";
import { recordViewChordKey, type ViewChordPending } from "./viewModeChord";
import type { ReviewSubmission } from "./commentTypes";
import { ProgressHeader } from "./components/ProgressHeader";
import { Sidebar } from "./components/Sidebar";
import { DiffPane } from "./components/DiffPane";
import { DescriptionPane } from "./components/DescriptionPane";
import { ContextPanel } from "./components/ContextPanel";
import { FooterNav } from "./components/FooterNav";
import { SubmitReviewModal } from "./components/SubmitReviewModal";

interface OverlayProps {
  /** Invoked when the user exits so any in-flight stream can be cancelled. */
  onRequestClose?: () => void;
  /** Retry a failed annotate / review-build step. */
  onRetry?: () => void;
}

/**
 * Whether this keydown targets an editable control. Uses composedPath so we
 * see elements inside the overlay's open shadow root (event.target is retargeted
 * to the host for listeners outside the shadow tree).
 */
function findEditableInPath(event: KeyboardEvent): HTMLElement | null {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement)) continue;
    const tag = node.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return node;
    if (node.isContentEditable) return node;
  }
  return null;
}

function isEditableEvent(event: KeyboardEvent): boolean {
  return findEditableInPath(event) !== null;
}

function editableTextValue(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value;
  }
  return el.innerText ?? "";
}

export function Overlay({ onRequestClose, onRetry }: OverlayProps) {
  const isOpen = useReviewStore((s) => s.isOpen);
  const status = useReviewStore((s) => s.status);
  const error = useReviewStore((s) => s.error);
  const diff = useReviewStore((s) => s.diff);
  const plan = useReviewStore((s) => s.plan);
  const prContext = useReviewStore((s) => s.prContext);
  const currentUnitIndex = useReviewStore((s) => s.currentUnitIndex);
  const sessionKey = useReviewStore((s) => s.sessionKey);
  const uiMode = useReviewStore((s) => s.uiMode);
  const diffViewMode = useReviewStore((s) => s.diffViewMode);
  const close = useReviewStore((s) => s.close);
  const goToUnit = useReviewStore((s) => s.goToUnit);
  const goNext = useReviewStore((s) => s.goNext);
  const goPrev = useReviewStore((s) => s.goPrev);
  const codeColRef = useRef<HTMLElement>(null);
  const contextPaneRef = useRef<HTMLDivElement>(null);
  /** Pending `v` leader for view-mode chords (`v+u` / `v+s`). */
  const viewChordRef = useRef<ViewChordPending>(null);
  const [submitReviewOpen, setSubmitReviewOpen] = useState(false);
  /** Latest submit action from the open Submit Review modal (for ⌘/Ctrl+Enter). */
  const submitReviewActionRef = useRef<(() => void) | null>(null);
  /** Choose-step keys (↑/↓/Enter) for the open Submit Review modal. */
  const submitReviewKeyRef = useRef<((e: KeyboardEvent) => boolean) | null>(
    null,
  );

  const handleExit = () => {
    onRequestClose?.();
    close();
  };

  const handleSubmitReview = (_submission: ReviewSubmission) => {
    // API integration later — UI only closes the modal for now.
    setSubmitReviewOpen(false);
  };

  const draftComments = useReviewStore((s) => s.draftComments);

  useEffect(() => {
    if (status === "ready") void persistSession();
  }, [status, currentUnitIndex, sessionKey, draftComments]);

  // When the active unit changes (keyboard ←/→, footer nav, or sidebar click),
  // reset the code and context panes so the new step starts at the top rather
  // than inheriting scroll position from the previous unit.
  useEffect(() => {
    if (!isOpen) return;
    codeColRef.current?.scrollTo({ top: 0 });
    contextPaneRef.current?.scrollTo({ top: 0 });
  }, [isOpen, currentUnitIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  const planStillBuilding = status === "loading" || status === "streaming";
  // Spinner on the description unit only while the plan is still being built.
  const showBuildingSpinner =
    planStillBuilding && (!plan || currentUnitIndex === 0);
  const displayUnits = buildDisplayUnits(plan);
  const total = displayUnitCount(plan);
  const currentDisplay = displayUnits[currentUnitIndex] ?? displayUnits[0];
  const isDescriptionUnit =
    !currentDisplay || currentDisplay.kind === "pr_description";
  const currentReviewUnit =
    currentDisplay?.kind === "review" ? currentDisplay.unit : null;

  const resolvedFiles = useMemo(
    () =>
      currentReviewUnit && diff
        ? resolveUnitFiles(currentReviewUnit, diff)
        : [],
    [currentReviewUnit, diff],
  );

  const selectableForUnit = useMemo(
    () => buildSelectableLines(resolvedFiles, diffViewMode),
    [resolvedFiles, diffViewMode],
  );

  // Keep store selectable lines in sync while in comment mode (e.g. view toggle).
  useEffect(() => {
    if (uiMode !== "comment") return;
    useReviewStore.getState().setSelectableLines(selectableForUnit);
  }, [uiMode, selectableForUnit]);

  const currentUnitId = currentReviewUnit?.id;

  useEffect(() => {
    if (!isOpen) return;

    const SCROLL_STEP = 120;
    viewChordRef.current = null;

    // Capture on window so we run before GitHub's document-level shortcuts.
    // The overlay mounts in an open shadow root; with focus inside it,
    // document.activeElement is the host — GitHub thinks nothing is focused
    // and would fire s/t/c/a/i/etc. Always stopPropagation so the page never
    // sees keys while the overlay is open. Only preventDefault when we consume
    // the key (so typing into the comment composer still inserts characters).
    function onKeyDown(event: KeyboardEvent): void {
      event.stopPropagation();

      // Submit-review modal: Esc closes the dialog only (not the whole overlay).
      // ⌘/Ctrl+Enter submits on the compose step; ↑/↓/Enter drive the choose step.
      // Handled here because capture stopPropagation blocks element React handlers.
      if (submitReviewOpen) {
        viewChordRef.current = null;
        if (event.key === "Escape") {
          event.preventDefault();
          setSubmitReviewOpen(false);
          return;
        }
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          submitReviewActionRef.current?.();
          return;
        }
        if (submitReviewKeyRef.current?.(event)) {
          event.preventDefault();
        }
        return;
      }

      const store = useReviewStore.getState();
      const editable = isEditableEvent(event);

      // Composer / any editable: let the control own typing. Handle Esc and
      // ⌘/Ctrl+Enter here because stopPropagation in capture prevents the
      // textarea's React onKeyDown from running for real keystrokes.
      if (store.composerOpen || editable) {
        viewChordRef.current = null;
        if (event.key === "Escape") {
          event.preventDefault();
          if (store.composerOpen) store.closeComposer();
          return;
        }
        if (
          store.composerOpen &&
          event.key === "Enter" &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          const el = findEditableInPath(event);
          const body = el ? editableTextValue(el) : "";
          store.saveDraftComment(body, currentUnitId);
          return;
        }
        return;
      }

      // ⌘/Ctrl+Enter opens the Submit Review modal (when not typing in a field).
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        viewChordRef.current = null;
        setSubmitReviewOpen(true);
        return;
      }

      // View-mode chords: v+u (unified), v+s (split). Both navigate and comment mode.
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        const { next, mode, consumed } = recordViewChordKey(
          viewChordRef.current,
          event.key,
          Date.now(),
        );
        viewChordRef.current = next;
        if (consumed) {
          event.preventDefault();
          if (mode) store.setDiffViewMode(mode);
          return;
        }
      } else {
        viewChordRef.current = null;
      }

      if (store.uiMode === "comment") {
        switch (event.key) {
          case "Escape":
            event.preventDefault();
            viewChordRef.current = null;
            store.exitCommentMode();
            return;
          case "ArrowUp":
            event.preventDefault();
            viewChordRef.current = null;
            store.moveLineCursor(-1, event.shiftKey);
            return;
          case "ArrowDown":
            event.preventDefault();
            viewChordRef.current = null;
            store.moveLineCursor(1, event.shiftKey);
            return;
          case "Enter":
            event.preventDefault();
            viewChordRef.current = null;
            store.openComposer();
            return;
          case "ArrowRight":
            event.preventDefault();
            viewChordRef.current = null;
            store.goNext();
            return;
          case "ArrowLeft":
            event.preventDefault();
            viewChordRef.current = null;
            store.goPrev();
            return;
          default:
            return;
        }
      }

      // navigate mode
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          viewChordRef.current = null;
          onRequestClose?.();
          store.close();
          return;
        case "ArrowRight":
          event.preventDefault();
          viewChordRef.current = null;
          store.goNext();
          return;
        case "ArrowLeft":
          event.preventDefault();
          viewChordRef.current = null;
          store.goPrev();
          return;
        case "ArrowUp":
          event.preventDefault();
          event.stopPropagation();
          codeColRef.current?.scrollBy({
            top: -SCROLL_STEP,
            behavior: "smooth",
          });
          return;
        case "ArrowDown":
          event.preventDefault();
          event.stopPropagation();
          codeColRef.current?.scrollBy({
            top: SCROLL_STEP,
            behavior: "smooth",
          });
          return;
        case "c":
        case "C":
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          event.preventDefault();
          viewChordRef.current = null;
          if (selectableForUnit.length > 0) {
            store.enterCommentMode(selectableForUnit);
          }
          return;
        default:
          return;
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    isOpen,
    onRequestClose,
    selectableForUnit,
    currentUnitId,
    submitReviewOpen,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483000] flex flex-col bg-gr-bg font-sans text-sm text-gr-text antialiased [color-scheme:dark] [text-rendering:optimizeLegibility]">
      <ProgressHeader
        prContext={prContext}
        diff={diff}
        onExit={handleExit}
        onSubmitReview={() => setSubmitReviewOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <main
          className="min-w-0 flex-[1_1_68%] overflow-y-auto border-r border-gr-border bg-gr-bg px-8 py-6"
          ref={codeColRef}
          data-testid="code-col"
        >
          {isDescriptionUnit ? (
            <DescriptionPane prContext={prContext} diff={diff} />
          ) : (
            <DiffPane
              files={resolvedFiles}
              unitTitle={currentReviewUnit?.title ?? ""}
              unitId={currentReviewUnit?.id}
            />
          )}
        </main>

        <aside className="flex max-w-[420px] min-w-[300px] flex-[1_1_32%] flex-col overflow-hidden bg-gr-chrome px-5 py-6">
          <div
            className="min-h-0 flex-[1_1_50%] overflow-y-auto"
            ref={contextPaneRef}
            data-testid="context-pane"
          >
            <ContextPanel
              unit={currentReviewUnit}
              hasTitle={Boolean(prContext?.title?.trim())}
              hasDescription={Boolean(
                prContext?.description?.trim() ||
                prContext?.descriptionHtml?.trim(),
              )}
              error={status === "error" ? error : null}
              loading={showBuildingSpinner && isDescriptionUnit}
              onRetry={status === "error" ? onRetry : undefined}
            />
          </div>
          <Sidebar
            plan={plan}
            currentUnitIndex={currentUnitIndex}
            stillBuilding={planStillBuilding}
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

      <SubmitReviewModal
        open={submitReviewOpen}
        onClose={() => setSubmitReviewOpen(false)}
        onSubmit={handleSubmitReview}
        submitActionRef={submitReviewActionRef}
        keyActionRef={submitReviewKeyRef}
      />
    </div>
  );
}
