import { useEffect, useLayoutEffect, useId, useMemo, useRef, useState } from "react";
import type { SelectHandle } from "@guided-review/ui";
import { formatAgentPrompt, resolveUnitFiles } from "@guided-review/core";
import type { ReviewErrorInfo, ReviewPlan } from "@guided-review/ui/review/types";
import {
  selectionKey,
  summaryUnitTitle,
  useReviewStore,
  persistSession,
  type BuildPhase,
  type ReviewStatus,
} from "./store";
import { orderedFiles } from "./fileNavigation";
import { buildSelectableLines } from "./buildSelectableLines";
import { restoreFocusAfterOverlay } from "./focusTrap";
import { useOverlayKeyboard, type ViewChordPending } from "./useOverlayKeyboard";
import { useSubmitReviewFlow } from "./useSubmitReviewFlow";
import { findUnitForFile, type DiffSearchResult, type SearchScrollTarget } from "./diffSearch";
import { ProgressHeader } from "@guided-review/ui/review/components/ProgressHeader";
import { Sidebar } from "@guided-review/ui/review/components/Sidebar";
import { DiffPane } from "@guided-review/ui/review/components/DiffPane";
import { DescriptionPane } from "@guided-review/ui/review/components/DescriptionPane";
import { ContextPanel } from "@guided-review/ui/review/components/ContextPanel";
import { FooterNav } from "@guided-review/ui/review/components/FooterNav";
import { DiffSearch } from "@guided-review/ui/review/components/DiffSearch";
import { Button, confirm, ConfirmationHost, useConfirmationOpen } from "@guided-review/ui";
import { GeneratePromptModal } from "@guided-review/ui/review/components/GeneratePromptModal";
import { SubmitReviewModal } from "@guided-review/ui/review/components/SubmitReviewModal";
import { ReviewSubmittedModal } from "@guided-review/ui/review/components/ReviewSubmittedModal";
import { BUILD_PLAN_PRIMARY, buildPhaseDetail } from "./overlayCopy";
import { useReviewHost } from "./host";
import type { LocalDiffControls } from "./localReview";

interface OverlayProps {
  /** Invoked when the user exits so any in-flight stream can be cancelled. */
  onRequestClose?: () => void;
  /** Retry a failed annotate / review-build step. */
  onRetry?: () => void;
  /** When false, hide Exit and ignore Esc-to-exit (local CLI). Default true. */
  allowExit?: boolean;
  /** CLI-only: scope picker, commit cards, opt-in structure. */
  localDiff?: LocalDiffControls;
  /**
   * CLI settings modal is open on top. Overlay stays painted underneath but
   * ignores pointer/keyboard so the modal can own Esc, Tab, and focus.
   */
  inert?: boolean;
}

/** Polite live-region text for build / error / ready status. */
function statusAnnouncementText(
  status: ReviewStatus,
  error: ReviewErrorInfo | null,
  plan: ReviewPlan | null,
  needsProvider: boolean,
  buildPhase: BuildPhase | null,
  providerLabel: string | null,
  planSource: "ai" | "files" | null,
): string {
  if (status === "error" && error) {
    return `Error: ${error.message}`;
  }
  if (needsProvider && status === "ready" && plan) {
    return "Files ready to review. AI review plans are optional.";
  }
  if (needsProvider) {
    return "Connect an AI Provider to enable the AI features.";
  }
  if (status === "loading" || status === "streaming") {
    if (status === "loading") return "Loading changed files…";
    const detail = buildPhase != null ? buildPhaseDetail(buildPhase, providerLabel) : null;
    const n = plan?.units.length ?? 0;
    if (status === "streaming" && n > 0) {
      return `${BUILD_PLAN_PRIMARY}. ${n} review unit${n === 1 ? "" : "s"} ready.${detail ? ` ${detail}` : ""}`;
    }
    return detail ? `${BUILD_PLAN_PRIMARY}. ${detail}` : `${BUILD_PLAN_PRIMARY}…`;
  }
  if (status === "ready" && plan) {
    return planSource === "ai"
      ? `Review plan ready. ${plan.units.length} review units available.`
      : "Files ready to review.";
  }
  return "";
}

export function Overlay({
  onRequestClose,
  onRetry,
  allowExit = true,
  localDiff,
  inert = false,
}: OverlayProps) {
  const host = useReviewHost();
  const ConnectionDialog = host.submit?.ConnectionDialog;
  const isOpen = useReviewStore((s) => s.isOpen);
  const status = useReviewStore((s) => s.status);
  const error = useReviewStore((s) => s.error);
  const needsProvider = useReviewStore((s) => s.needsProvider);
  const buildPhase = useReviewStore((s) => s.buildPhase);
  const providerLabel = useReviewStore((s) => s.providerLabel);
  const diff = useReviewStore((s) => s.diff);
  const plan = useReviewStore((s) => s.plan);
  const prContext = useReviewStore((s) => s.prContext);
  const selection = useReviewStore((s) => s.selection);
  const navigationMode = useReviewStore((s) => s.navigationMode);
  const planSource = useReviewStore((s) => s.planSource);
  const planComplete = useReviewStore((s) => s.planComplete);
  const pendingComposers = useReviewStore((s) => s.pendingComposers);
  const collapsedDirectories = useReviewStore((s) => s.collapsedDirectories);
  const scrollPositions = useReviewStore((s) => s.scrollPositions);
  const sessionKey = useReviewStore((s) => s.sessionKey);
  const diffViewMode = useReviewStore((s) => s.diffViewMode);
  const close = useReviewStore((s) => s.close);
  const goToUnit = useReviewStore((s) => s.goToUnit);
  const goToFile = useReviewStore((s) => s.goToFile);
  const goNext = useReviewStore((s) => s.goNext);
  const goPrev = useReviewStore((s) => s.goPrev);
  const draftComments = useReviewStore((s) => s.draftComments);
  const clearDraftComments = useReviewStore((s) => s.clearDraftComments);
  const overlayRef = useRef<HTMLDivElement>(null);
  const submitModalDialogRef = useRef<HTMLDivElement>(null);
  const generatePromptDialogRef = useRef<HTMLDivElement>(null);
  const generatePromptCopyActionRef = useRef<(() => void) | null>(null);
  const codeColRef = useRef<HTMLElement>(null);
  const contextPaneRef = useRef<HTMLDivElement>(null);
  /** Element focused before the overlay opened (for restore if start button gone). */
  const previousFocusRef = useRef<Element | null>(null);
  /** Pending `v` leader for view-mode chords (`v+u` / `v+s`). */
  const viewChordRef = useRef<ViewChordPending>(null);
  const scopeSelectRef = useRef<SelectHandle | null>(null);
  const confirmationOpen = useConfirmationOpen();
  const titleId = useId();
  const drawerId = useId();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const generatePlan = host.generatePlan ?? localDiff?.onStructureReview;

  function closeNavigation() {
    setNavigationOpen(false);
    browseButtonRef.current?.focus();
  }

  function focusReviewContent() {
    setNavigationOpen(false);
    codeColRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!navigationOpen) return;
    drawerRef.current?.focus();
    const wide = window.matchMedia("(min-width: 1024px)");
    const onResize = () => {
      if (wide.matches) {
        setNavigationOpen(false);
        overlayRef.current?.focus();
      }
    };
    wide.addEventListener("change", onResize);
    return () => wide.removeEventListener("change", onResize);
  }, [navigationOpen]);

  const [generatePromptOpen, setGeneratePromptOpen] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [diffSearchOpen, setDiffSearchOpen] = useState(false);
  /** Bumped on each ⌘F so DiffSearch re-focuses even when already open. */
  const [diffSearchFocusId, setDiffSearchFocusId] = useState(0);
  const [searchScrollTarget, setSearchScrollTarget] = useState<SearchScrollTarget | null>(null);
  const diffSearchKeyRef = useRef<((e: KeyboardEvent) => boolean) | null>(null);
  /** Set by search navigation so unit-change scroll-to-top does not fight the match jump. */
  const skipCodeScrollOnUnitChange = useRef(false);

  function openDiffSearch() {
    setNavigationOpen(false);
    setDiffSearchOpen(true);
    setDiffSearchFocusId((n) => n + 1);
  }

  function closeDiffSearch() {
    setDiffSearchOpen(false);
  }

  function handleDiffSearchSelect(result: DiffSearchResult) {
    const hunkId = result.kind === "line" ? result.hunkId : undefined;
    const unitIndex =
      navigationMode === "units" && planSource === "ai"
        ? findUnitForFile(plan, result.filePath, hunkId)
        : null;
    skipCodeScrollOnUnitChange.current = true;
    if (unitIndex !== null) goToUnit(unitIndex);
    else goToFile(result.filePath);
    codeColRef.current?.focus();
    setSearchScrollTarget({
      filePath: result.filePath,
      lineId: result.kind === "line" ? result.id : undefined,
    });
    setDiffSearchOpen(false);
  }

  function clearSearchScrollTarget() {
    setSearchScrollTarget(null);
  }

  function openGeneratePrompt() {
    if (draftComments.length === 0) return;
    const prompt = formatAgentPrompt(
      draftComments.map((draft) => ({
        filePath: draft.filePath,
        startLine: draft.startLine,
        endLine: draft.endLine,
        body: draft.body,
        unitId: draft.unitId,
        selectedCode: draft.selectedCode,
      })),
    );
    if (!prompt) return;
    setGeneratedPrompt(prompt);
    setGeneratePromptOpen(true);
  }

  function closeGeneratePrompt() {
    setGeneratePromptOpen(false);
    requestAnimationFrame(() => {
      overlayRef.current
        ?.querySelector<HTMLElement>(
          host.submit && host.exportNotes
            ? '[data-testid="generate-prompt-button"]'
            : '[data-testid="submit-review-button"]',
        )
        ?.focus();
    });
  }

  function handleExit() {
    void persistSession();
    onRequestClose?.();
    close();
  }

  /** Esc (and Exit button) — confirm before leaving the review. */
  function requestExit() {
    if (!allowExit) return;
    confirm({
      title: "Exit Review?",
      body: host.preview
        ? "Preview comments will be discarded. You can open a fresh sample review anytime."
        : host.kind === "local"
          ? "Draft notes stay for this session. Re-run the command to start again."
          : "You can reopen on this PR later. Draft comments stay for this browser session.",
      variant: "destructive",
      okButtonText: "Exit",
      cancelButtonText: "Stay",
      okButtonHandler: () => {
        handleExit();
      },
    });
  }

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

  function handlePrimaryReviewAction() {
    if (!host.submit && host.exportNotes) {
      openGeneratePrompt();
      return;
    }
    void requestOpenSubmitReview();
  }

  useEffect(() => {
    // Coalesce typing and scrolling; persist file reviews and partial plans too.
    const timer = window.setTimeout(() => {
      void persistSession();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [
    status,
    selection,
    navigationMode,
    sessionKey,
    draftComments,
    pendingComposers,
    collapsedDirectories,
    scrollPositions,
    plan,
    planComplete,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const save = () => {
      void persistSession();
    };
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [isOpen]);

  // Drop search UI when the overlay closes so the next open starts clean.
  useEffect(() => {
    if (!isOpen) {
      setDiffSearchOpen(false);
      setSearchScrollTarget(null);
    }
  }, [isOpen]);

  const contentKey = selectionKey(selection);
  useLayoutEffect(() => {
    if (!isOpen) return;
    if (skipCodeScrollOnUnitChange.current) skipCodeScrollOnUnitChange.current = false;
    else
      codeColRef.current?.scrollTo({
        top: useReviewStore.getState().scrollPositions[contentKey] ?? 0,
      });
    contextPaneRef.current?.scrollTo({ top: 0 });
  }, [isOpen, contentKey]);

  useEffect(() => {
    if (!isOpen) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  // Focus the dialog, not the first control (the CLI scope picker would eat arrows).
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;
    const frame = requestAnimationFrame(() => {
      overlayRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      restoreFocusAfterOverlay(previousFocusRef.current);
    };
  }, [isOpen]);

  const files = useMemo(() => orderedFiles(diff), [diff]);
  const total =
    navigationMode === "files" ? files.length : planSource === "ai" ? (plan?.units.length ?? 0) : 0;
  const currentIndex =
    selection.kind === "summary"
      ? 0
      : selection.kind === "file"
        ? files.findIndex((file) => file.path === selection.path) + 1
        : (plan?.units.findIndex((unit) => unit.id === selection.id) ?? -1) + 1;
  const footerLabel =
    selection.kind === "summary"
      ? summaryUnitTitle(host.kind)
      : `${navigationMode === "files" ? "File" : "Review unit"} ${currentIndex} of ${total}`;
  const isDescriptionUnit = selection.kind === "summary";
  const currentReviewUnit =
    selection.kind === "unit" && planSource === "ai"
      ? (plan?.units.find((unit) => unit.id === selection.id) ?? null)
      : null;
  const selectedFile =
    selection.kind === "file" ? diff?.files.find((file) => file.path === selection.path) : null;
  const resolvedFiles = useMemo(
    () =>
      selectedFile
        ? [{ file: selectedFile, hunks: selectedFile.hunks }]
        : currentReviewUnit && diff
          ? resolveUnitFiles(currentReviewUnit, diff)
          : [],
    [selectedFile, currentReviewUnit, diff],
  );

  const selectableForUnit = useMemo(
    () => buildSelectableLines(resolvedFiles, diffViewMode),
    [resolvedFiles, diffViewMode],
  );

  // Keep store selectable lines in sync while in comment mode (e.g. view toggle).
  useEffect(() => {
    useReviewStore.getState().setSelectableLines(selectableForUnit);
  }, [selectableForUnit]);

  const currentUnitId = currentReviewUnit?.id;

  useOverlayKeyboard({
    isOpen,
    suspended: inert,
    navigationDrawerRef: drawerRef,
    navigationOpen,
    closeNavigation,
    overlayRef,
    submitModalDialogRef,
    generatePromptDialogRef,
    codeColRef,
    viewChordRef,
    selectableForUnit,
    currentUnitId,
    submitReviewOpen,
    generatePromptOpen,
    connectGitHubOpen,
    submitSuccess,
    submitReviewActionRef,
    submitReviewKeyRef,
    generatePromptCopyActionRef,
    connectGitHubActionRef,
    exitAfterSubmit,
    requestOpenSubmitReview: handlePrimaryReviewAction,
    closeSubmitReviewModal,
    closeGeneratePrompt,
    setConnectGitHubOpen: closeConnectGitHubModal,
    confirmationOpen,
    requestExit,
    diffSearchOpen,
    openDiffSearch,
    closeDiffSearch,
    diffSearchKeyRef,
    openScopePicker:
      localDiff && localDiff.scopes.length > 0
        ? () => scopeSelectRef.current?.focusAndOpen()
        : undefined,
    structureReview:
      !planComplete && diff?.files.length && status !== "streaming" && status !== "loading"
        ? () => {
            useReviewStore.getState().setNavigationMode("units");
            if (needsProvider) host.connectProvider();
            else generatePlan?.();
          }
        : undefined,
    openSettings: host.kind === "local" ? () => host.connectProvider() : undefined,
  });

  const statusAnnouncement = statusAnnouncementText(
    status,
    error,
    plan,
    needsProvider,
    buildPhase,
    providerLabel,
    planSource,
  );

  if (!isOpen) return null;

  const dialogTitle = prContext?.title?.trim() || "Guided Review";

  // z-index: GitHub's sticky header and dialogs stack in the millions; sit above them.
  // color-scheme: native scrollbars follow the overlay, not the light GitHub page.
  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      inert={inert || undefined}
      className="gr-review fixed inset-0 z-[2147483000] flex flex-col bg-surface font-sans text-base text-foreground antialiased outline-none [color-scheme:dark] [text-rendering:optimizeLegibility]"
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
        allowExit={allowExit}
        localDiff={localDiff}
        scopeSelectRef={scopeSelectRef}
        notesCount={draftComments.length}
        onSubmitReview={handlePrimaryReviewAction}
        onGeneratePrompt={openGeneratePrompt}
      />

      <div className="border-b border-border px-3 py-2 lg:hidden">
        <Button
          ref={browseButtonRef}
          variant="secondary"
          size="sm"
          aria-expanded={navigationOpen}
          aria-controls={navigationOpen ? drawerId : undefined}
          data-testid="browse-changes"
          onClick={() => setNavigationOpen(true)}
        >
          Browse changes
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="hidden min-h-0 w-72 shrink-0 border-r border-border bg-background lg:flex">
          <Sidebar onGenerate={generatePlan} onSelect={focusReviewContent} />
        </aside>
        <main
          id="main-content"
          className="min-h-0 min-w-0 flex-1 overflow-y-auto scroll-pt-10 border-r border-border bg-surface"
          ref={codeColRef}
          data-testid="code-col"
          tabIndex={-1}
          onScroll={(event) =>
            useReviewStore.getState().saveScrollPosition(contentKey, event.currentTarget.scrollTop)
          }
        >
          <div className="px-4 py-4 md:px-8 md:py-6">
            {isDescriptionUnit ? (
              <DescriptionPane
                prContext={prContext}
                diff={diff}
                commits={localDiff?.commits}
                uncommitted={localDiff?.scopes.find(
                  (scope) => scope.id === "uncommitted" && !scope.empty,
                )}
              />
            ) : (
              <DiffPane
                files={resolvedFiles}
                unitTitle={selectedFile?.path ?? currentReviewUnit?.title ?? ""}
                unitTitleTooltip={currentReviewUnit?.title}
                isTestsUnit={currentReviewUnit?.kind === "tests"}
                unitId={currentReviewUnit?.id}
                selectableForUnit={selectableForUnit}
                searchScrollTarget={searchScrollTarget}
                onSearchScrollTargetConsumed={clearSearchScrollTarget}
              />
            )}
          </div>
        </main>

        <aside
          className="flex min-h-0 flex-[1_1_32%] flex-col overflow-hidden border-t border-border bg-background md:max-w-[420px] md:min-w-[300px] md:border-t-0"
          aria-label="Review context"
        >
          <div
            className="min-h-0 flex-1 overflow-y-auto"
            ref={contextPaneRef}
            data-testid="context-pane"
          >
            <div className="px-5 py-6">
              <ContextPanel
                unit={currentReviewUnit}
                hasTitle={Boolean(prContext?.title?.trim())}
                hasDescription={Boolean(
                  prContext?.description?.trim() || prContext?.descriptionHtml?.trim(),
                )}
                error={status === "error" ? error : null}
                onRetry={status === "error" ? onRetry : undefined}
              />
            </div>
          </div>
        </aside>
      </div>

      <FooterNav
        currentIndex={currentIndex}
        total={total}
        label={footerLabel}
        onPrev={goPrev}
        onNext={goNext}
      />

      {navigationOpen && (
        <div
          className="absolute inset-0 z-30 bg-background/80 lg:hidden"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeNavigation();
          }}
        >
          <div
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label="Browse changes"
            tabIndex={-1}
            className="flex h-full w-80 max-w-full flex-col border-r border-border bg-background outline-none"
            data-testid="navigation-drawer"
          >
            <div className="flex justify-end p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeNavigation}
                data-testid="navigation-drawer-close"
              >
                Close
              </Button>
            </div>
            <Sidebar onGenerate={generatePlan} onSelect={focusReviewContent} />
          </div>
        </div>
      )}

      <DiffSearch
        open={diffSearchOpen}
        diff={diff}
        onClose={closeDiffSearch}
        onSelect={handleDiffSearchSelect}
        focusRequestId={diffSearchFocusId}
        keyActionRef={diffSearchKeyRef}
      />

      {ConnectionDialog && (
        <ConnectionDialog
          open={connectGitHubOpen}
          onClose={closeConnectGitHubModal}
          onAuthenticated={openSubmitReviewModalAfterAuth}
          connectActionRef={connectGitHubActionRef}
        />
      )}

      <GeneratePromptModal
        open={generatePromptOpen}
        prompt={generatedPrompt}
        onClose={closeGeneratePrompt}
        copyActionRef={generatePromptCopyActionRef}
        dialogRef={generatePromptDialogRef}
      />

      <SubmitReviewModal
        preview={Boolean(host.preview)}
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
        preview={Boolean(host.preview)}
        open={submitSuccess !== null}
        event={submitSuccess?.event ?? "COMMENT"}
        commentCount={submitSuccess?.commentCount ?? 0}
        onExit={exitAfterSubmit}
      />

      {!inert && <ConfirmationHost />}
    </div>
  );
}
