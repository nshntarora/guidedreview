import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { useReviewStore, persistSession } from "./store";
import { resolveUnitFiles } from "./selectors";
import { buildDisplayUnits, displayUnitCount } from "./displayUnits";
import { buildSelectableLines } from "./buildSelectableLines";
import { getFocusableElements, restoreFocusAfterOverlay } from "./focusTrap";
import type { ViewChordPending } from "./viewModeChord";
import { useOverlayKeyboard } from "./useOverlayKeyboard";
import { useSubmitReviewFlow } from "./useSubmitReviewFlow";
import { ProgressHeader } from "./components/ProgressHeader";
import { Sidebar } from "./components/Sidebar";
import { DiffPane } from "./components/DiffPane";
import { DescriptionPane } from "./components/DescriptionPane";
import { ContextPanel } from "./components/ContextPanel";
import { FooterNav } from "./components/FooterNav";
import { ConnectGitHubModal } from "./components/ConnectGitHubModal";
import {
  confirm,
  ConfirmationHost,
  useConfirmationOpen,
} from "./components/confirmation";
import { SubmitReviewModal } from "./components/SubmitReviewModal";
import { ReviewSubmittedModal } from "./components/ReviewSubmittedModal";

interface OverlayProps {
  /** Invoked when the user exits so any in-flight stream can be cancelled. */
  onRequestClose?: () => void;
  /** Retry a failed annotate / review-build step. */
  onRetry?: () => void;
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
  const draftComments = useReviewStore((s) => s.draftComments);
  const clearDraftComments = useReviewStore((s) => s.clearDraftComments);
  const overlayRef = useRef<HTMLDivElement>(null);
  const submitModalDialogRef = useRef<HTMLDivElement>(null);
  const codeColRef = useRef<HTMLElement>(null);
  const contextPaneRef = useRef<HTMLDivElement>(null);
  /** Element focused before the overlay opened (for restore if start button gone). */
  const previousFocusRef = useRef<Element | null>(null);
  /** Pending `v` leader for view-mode chords (`v+u` / `v+s`). */
  const viewChordRef = useRef<ViewChordPending>(null);
  const confirmationOpen = useConfirmationOpen();
  const titleId = useId();

  const handleExit = useCallback(() => {
    onRequestClose?.();
    close();
  }, [onRequestClose, close]);

  /** Esc (and Exit button) — confirm before leaving the review. */
  const requestExit = useCallback(() => {
    confirm({
      title: "Exit review?",
      body: "You can reopen on this PR later. Draft comments stay for this browser session.",
      variant: "destructive",
      okButtonText: "Exit",
      cancelButtonText: "Stay",
      okButtonHandler: () => {
        handleExit();
      },
    });
  }, [handleExit]);

  const {
    submitReviewOpen,
    connectGitHubOpen,
    submittingReview,
    submitReviewError,
    submitSuccess,
    submitReviewActionRef,
    submitReviewKeyRef,
    connectGitHubActionRef,
    exitAfterSubmit,
    closeSubmitReviewModal,
    closeConnectGitHubModal,
    openSubmitReviewModalAfterAuth,
    requestOpenSubmitReview,
    handleSubmitReview,
  } = useSubmitReviewFlow({
    prContext,
    draftComments,
    clearDraftComments,
    handleExit,
    overlayRef,
  });

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

  // Modal focus: move into the overlay on open; restore to the start button on close.
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;
    const frame = requestAnimationFrame(() => {
      const root = overlayRef.current;
      if (!root) return;
      const focusable = getFocusableElements(root);
      (focusable[0] ?? root).focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      restoreFocusAfterOverlay(previousFocusRef.current);
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

  useOverlayKeyboard({
    isOpen,
    overlayRef,
    submitModalDialogRef,
    codeColRef,
    viewChordRef,
    selectableForUnit,
    currentUnitId,
    submitReviewOpen,
    connectGitHubOpen,
    submittingReview,
    submitSuccess,
    submitReviewActionRef,
    submitReviewKeyRef,
    connectGitHubActionRef,
    exitAfterSubmit,
    requestOpenSubmitReview,
    closeSubmitReviewModal,
    setConnectGitHubOpen: closeConnectGitHubModal,
    confirmationOpen,
    requestExit,
  });

  const statusAnnouncement = useMemo(() => {
    if (status === "error" && error) {
      return `Error: ${error.message}`;
    }
    if (status === "loading") {
      return "Loading pull request diff…";
    }
    if (status === "streaming") {
      const n = plan?.units.length ?? 0;
      return n > 0
        ? `Building review plan. ${n} review unit${n === 1 ? "" : "s"} ready.`
        : "Building review plan…";
    }
    if (status === "ready" && plan) {
      return `Review plan ready. ${displayUnitCount(plan)} steps.`;
    }
    return "";
  }, [status, error, plan]);

  if (!isOpen) return null;

  const dialogTitle = prContext?.title?.trim() || "Guided Review";

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-[2147483000] flex flex-col bg-gr-bg font-sans text-base text-gr-text antialiased outline-none [color-scheme:dark] [text-rendering:optimizeLegibility]"
      data-testid="guided-review-overlay"
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="gr-sr-only"
        data-testid="overlay-status-live"
      >
        {statusAnnouncement}
      </div>

      <ProgressHeader
        prContext={prContext}
        diff={diff}
        titleId={titleId}
        title={dialogTitle}
        onExit={requestExit}
        onSubmitReview={() => {
          void requestOpenSubmitReview();
        }}
      />

      <div className="flex min-h-0 flex-1">
        <main
          id="main-content"
          className="min-w-0 flex-[1_1_68%] overflow-y-auto border-r border-gr-border bg-gr-bg px-8 py-6"
          ref={codeColRef}
          data-testid="code-col"
          tabIndex={-1}
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

        <aside
          className="flex max-w-[420px] min-w-[300px] flex-[1_1_32%] flex-col overflow-hidden bg-gr-chrome py-6"
          aria-label="Review context and plan"
        >
          <div
            className="min-h-0 flex-[1_1_50%] overflow-y-auto"
            ref={contextPaneRef}
            data-testid="context-pane"
          >
            <div className="px-5">
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

      <ConnectGitHubModal
        open={connectGitHubOpen}
        onClose={closeConnectGitHubModal}
        onAuthenticated={openSubmitReviewModalAfterAuth}
        connectActionRef={connectGitHubActionRef}
      />

      <SubmitReviewModal
        open={submitReviewOpen}
        onClose={closeSubmitReviewModal}
        onSubmit={(submission) => {
          void handleSubmitReview(submission);
        }}
        submitting={submittingReview}
        error={submitReviewError}
        submitActionRef={submitReviewActionRef}
        keyActionRef={submitReviewKeyRef}
        dialogRef={submitModalDialogRef}
      />

      <ReviewSubmittedModal
        open={submitSuccess !== null}
        event={submitSuccess?.event ?? "COMMENT"}
        commentCount={submitSuccess?.commentCount ?? 0}
        onExit={exitAfterSubmit}
      />

      <ConfirmationHost />
    </div>
  );
}
