import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { getConfirmationDialogElement, isConfirmationOpen } from "./components/confirmation";
import type { SelectableLine } from "./commentTypes";
import { trapTabKey } from "./focusTrap";
import { recordViewChordKey, type ViewChordPending } from "./viewModeChord";
import { useReviewStore } from "./store";

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

interface UseOverlayKeyboardOptions {
  isOpen: boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
  submitModalDialogRef: RefObject<HTMLDivElement | null>;
  codeColRef: RefObject<HTMLElement | null>;
  viewChordRef: MutableRefObject<ViewChordPending>;
  selectableForUnit: SelectableLine[];
  currentUnitId: string | undefined;
  submitReviewOpen: boolean;
  connectGitHubOpen: boolean;
  /** Truthy while the post-submit success modal should own the keyboard. */
  submitSuccess: object | null;
  submitReviewActionRef: MutableRefObject<(() => void) | null>;
  submitReviewKeyRef: MutableRefObject<((e: KeyboardEvent) => boolean) | null>;
  connectGitHubActionRef: MutableRefObject<(() => void) | null>;
  exitAfterSubmit: () => void;
  requestOpenSubmitReview: () => void | Promise<void>;
  closeSubmitReviewModal: () => void;
  setConnectGitHubOpen: (open: boolean) => void;
  confirmationOpen: boolean;
  requestExit: () => void;
  /** Diff search palette (⌘/Ctrl+F) open state. */
  diffSearchOpen: boolean;
  openDiffSearch: () => void;
  closeDiffSearch: () => void;
  /** Arrow/Enter/Esc routing while the search palette owns the keyboard. */
  diffSearchKeyRef: MutableRefObject<((e: KeyboardEvent) => boolean) | null>;
}

/**
 * Global keyboard handling for the guided-review overlay: modal precedence
 * (confirmation → success → connect-GitHub → submit-review), the comment
 * composer, view-mode chords (`v u` / `v s`), and navigate/comment mode keys.
 *
 * Listens on window in the capture phase so the overlay sees keys before
 * GitHub's own document-level shortcuts, and always stops propagation while
 * open. Modal open flags are read through refs so the listener is current as
 * soon as state commits, not only after the effect re-runs.
 */
export function useOverlayKeyboard({
  isOpen,
  overlayRef,
  submitModalDialogRef,
  codeColRef,
  viewChordRef,
  selectableForUnit,
  currentUnitId,
  submitReviewOpen,
  connectGitHubOpen,
  submitSuccess,
  submitReviewActionRef,
  submitReviewKeyRef,
  connectGitHubActionRef,
  exitAfterSubmit,
  requestOpenSubmitReview,
  closeSubmitReviewModal,
  setConnectGitHubOpen,
  confirmationOpen,
  requestExit,
  diffSearchOpen,
  openDiffSearch,
  closeDiffSearch,
  diffSearchKeyRef,
}: UseOverlayKeyboardOptions): void {
  // Mirror modal flags into refs on every render so the capture listener never
  // sees a stale open state between React commit (modal paints) and this
  // effect re-running. Without this, Esc right after open can fall through to
  // requestExit while the modal is already visible.
  const submitReviewOpenRef = useRef(submitReviewOpen);
  submitReviewOpenRef.current = submitReviewOpen;
  const connectGitHubOpenRef = useRef(connectGitHubOpen);
  connectGitHubOpenRef.current = connectGitHubOpen;
  const submitSuccessRef = useRef(submitSuccess);
  submitSuccessRef.current = submitSuccess;
  const exitAfterSubmitRef = useRef(exitAfterSubmit);
  exitAfterSubmitRef.current = exitAfterSubmit;
  const closeSubmitReviewModalRef = useRef(closeSubmitReviewModal);
  closeSubmitReviewModalRef.current = closeSubmitReviewModal;
  const setConnectGitHubOpenRef = useRef(setConnectGitHubOpen);
  setConnectGitHubOpenRef.current = setConnectGitHubOpen;
  const requestOpenSubmitReviewRef = useRef(requestOpenSubmitReview);
  requestOpenSubmitReviewRef.current = requestOpenSubmitReview;
  const requestExitRef = useRef(requestExit);
  requestExitRef.current = requestExit;
  const diffSearchOpenRef = useRef(diffSearchOpen);
  diffSearchOpenRef.current = diffSearchOpen;
  const openDiffSearchRef = useRef(openDiffSearch);
  openDiffSearchRef.current = openDiffSearch;
  const closeDiffSearchRef = useRef(closeDiffSearch);
  closeDiffSearchRef.current = closeDiffSearch;

  useEffect(() => {
    if (!isOpen) return;

    const SCROLL_STEP = 120;

    /** Disarm a pending `v` leader so it cannot complete a chord later. */
    function clearViewChord(): void {
      viewChordRef.current = null;
    }

    clearViewChord();

    type Store = ReturnType<typeof useReviewStore.getState>;

    /**
     * Tab trap: confirmation → submit modal → overlay.
     * Must run here — window capture stopPropagation means element traps never see Tab.
     * Returns true when the key was consumed (caller should return).
     */
    function handleTabTrap(event: KeyboardEvent): boolean {
      if (event.key !== "Tab") return false;
      const confirmDialog = getConfirmationDialogElement();
      const trapRoot = confirmDialog
        ? confirmDialog
        : submitReviewOpenRef.current
          ? submitModalDialogRef.current
          : overlayRef.current;
      if (trapRoot) trapTabKey(event, trapRoot);
      return true;
    }

    /**
     * Confirmation → success → connect-GitHub → submit-review modals, in
     * that priority order. Each owns the key outright while open (even keys
     * it doesn't act on), so any true here means the caller should return.
     */
    function handleModalKeys(event: KeyboardEvent): boolean {
      // Confirmation dialog owns every key while open (highest priority modal).
      // It runs Enter/Esc from its own capture listener, so we only need to stop
      // the key here before it reaches the other modals or navigate mode.
      if (isConfirmationOpen()) return true;

      // Success modal: Enter / Esc exit the review (single CTA dialog).
      if (submitSuccessRef.current) {
        if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          exitAfterSubmitRef.current();
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          exitAfterSubmitRef.current();
          return true;
        }
        return true;
      }

      // Connect GitHub modal: Esc closes; Enter runs Connect / Try again / open GitHub.
      if (connectGitHubOpenRef.current) {
        if (event.key === "Escape") {
          event.preventDefault();
          setConnectGitHubOpenRef.current(false);
          return true;
        }
        if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          connectGitHubActionRef.current?.();
        }
        return true;
      }

      // Submit-review modal: Esc closes the dialog only (not the whole overlay).
      // ⌘/Ctrl+Enter submits on the compose step; ↑/↓/Enter drive the choose step.
      // Handled here because capture stopPropagation blocks element React handlers.
      if (submitReviewOpenRef.current) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeSubmitReviewModalRef.current();
          return true;
        }
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          submitReviewActionRef.current?.();
          return true;
        }
        if (submitReviewKeyRef.current?.(event)) {
          event.preventDefault();
        }
        return true;
      }

      return false;
    }

    /**
     * Composer / any editable: let the control own typing. Handle Esc and
     * ⌘/Ctrl+Enter here because stopPropagation in capture prevents the
     * textarea's React onKeyDown from running for real keystrokes.
     */
    function handleComposerKeys(event: KeyboardEvent, store: Store): boolean {
      const editable = isEditableEvent(event);
      if (!store.composerOpen && !editable) return false;

      if (event.key === "Escape") {
        event.preventDefault();
        if (store.composerOpen) store.closeComposer();
        return true;
      }
      if (store.composerOpen && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        const el = findEditableInPath(event);
        const body = el ? editableTextValue(el) : "";
        store.saveDraftComment(body, currentUnitId);
        return true;
      }
      return true;
    }

    /** View-mode chords: v+u (unified), v+s (split). Both navigate and comment mode. */
    function handleViewModeChord(event: KeyboardEvent, store: Store): boolean {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        clearViewChord();
        return false;
      }
      const { next, mode, consumed } = recordViewChordKey(
        viewChordRef.current,
        event.key,
        Date.now(),
      );
      viewChordRef.current = next;
      if (!consumed) return false;
      event.preventDefault();
      if (mode) store.setDiffViewMode(mode);
      return true;
    }

    function handleCommentModeKeys(event: KeyboardEvent, store: Store): void {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          store.exitCommentMode();
          return;
        case "ArrowUp":
          event.preventDefault();
          store.moveLineCursor(-1, event.shiftKey);
          return;
        case "ArrowDown":
          event.preventDefault();
          store.moveLineCursor(1, event.shiftKey);
          return;
        case "Enter":
          event.preventDefault();
          store.openComposer();
          return;
        case "ArrowRight":
          event.preventDefault();
          store.goNext();
          return;
        case "ArrowLeft":
          event.preventDefault();
          store.goPrev();
          return;
        default:
          return;
      }
    }

    function handleNavigateModeKeys(event: KeyboardEvent, store: Store): void {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          requestExitRef.current();
          return;
        case "ArrowRight":
          event.preventDefault();
          store.goNext();
          return;
        case "ArrowLeft":
          event.preventDefault();
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
          if (selectableForUnit.length > 0) {
            store.enterCommentMode(selectableForUnit);
          }
          return;
        default:
          return;
      }
    }

    function isFindShortcut(event: KeyboardEvent): boolean {
      return (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "f"
      );
    }

    // Capture on window so we run before GitHub's document-level shortcuts.
    // The overlay mounts in an open shadow root; with focus inside it,
    // document.activeElement is the host — GitHub thinks nothing is focused
    // and would fire s/t/c/a/i/etc. Always stopPropagation so the page never
    // sees keys while the overlay is open. Only preventDefault when we consume
    // the key (so typing into the comment composer still inserts characters).
    function onKeyDown(event: KeyboardEvent): void {
      event.stopPropagation();

      if (handleTabTrap(event)) return;

      // A key claimed by a modal, the composer, or the submit shortcut never
      // reaches handleViewModeChord, so those three paths disarm a pending `v`
      // themselves. Everything else does reach it, and recordViewChordKey
      // returns a null pending state for every key except `v`.
      if (handleModalKeys(event)) {
        clearViewChord();
        return;
      }

      // ⌘/Ctrl+F: always open (or re-focus) the diff search palette. Must run
      // before composer handling so find is not swallowed as "editable typing".
      if (isFindShortcut(event)) {
        event.preventDefault();
        clearViewChord();
        openDiffSearchRef.current();
        return;
      }

      // Diff search owns Esc / arrows / Enter while open (above the composer so
      // Esc closes search instead of only clearing a pending composer state).
      if (diffSearchOpenRef.current) {
        clearViewChord();
        // Esc is handled here so close works even before DiffSearch mounts its ref.
        if (event.key === "Escape") {
          event.preventDefault();
          closeDiffSearchRef.current();
          return;
        }
        if (diffSearchKeyRef.current?.(event)) {
          event.preventDefault();
          return;
        }
        // Typing into the search input: do not run navigate/comment shortcuts.
        if (isEditableEvent(event)) return;
        // Other unbound keys are swallowed while the palette is open.
        return;
      }

      const store = useReviewStore.getState();

      if (handleComposerKeys(event, store)) {
        clearViewChord();
        return;
      }

      // ⌘/Ctrl+Enter opens Submit Review (or Connect GitHub if unauthenticated).
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        clearViewChord();
        void requestOpenSubmitReviewRef.current();
        return;
      }

      if (handleViewModeChord(event, store)) return;

      if (store.uiMode === "comment") {
        handleCommentModeKeys(event, store);
        return;
      }

      handleNavigateModeKeys(event, store);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    isOpen,
    selectableForUnit,
    currentUnitId,
    // Modal open flags / callbacks are read from refs (updated each render) so
    // the listener is current as soon as state commits — not only after effect.
    // confirmationOpen forces a rebind when the confirm dialog mounts (Tab trap).
    confirmationOpen,
    overlayRef,
    submitModalDialogRef,
    codeColRef,
    viewChordRef,
    submitReviewActionRef,
    submitReviewKeyRef,
    connectGitHubActionRef,
    diffSearchKeyRef,
  ]);
}
