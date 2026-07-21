import { useEffect, type MutableRefObject, type RefObject } from "react";
import {
  confirmationHandlesKey,
  getConfirmationDialogElement,
} from "./components/confirmation";
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
  submittingReview: boolean;
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
}

/**
 * Global keyboard handling for the guided-review overlay: modal precedence
 * (confirmation → success → connect-GitHub → submit-review), the comment
 * composer, view-mode chords (`v u` / `v s`), and navigate/comment mode keys.
 *
 * Extracted from Overlay as-is — the capture-on-window design and dependency
 * list are unchanged; only the location moved.
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
  submittingReview,
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
}: UseOverlayKeyboardOptions): void {
  useEffect(() => {
    if (!isOpen) return;

    const SCROLL_STEP = 120;
    viewChordRef.current = null;

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
        : submitReviewOpen
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
      // Confirmation dialog: Enter = OK, Esc = cancel (highest priority modal).
      if (confirmationHandlesKey(event)) {
        event.preventDefault();
        viewChordRef.current = null;
        return true;
      }

      // Success modal: Enter / Esc exit the review (single CTA dialog).
      if (submitSuccess) {
        viewChordRef.current = null;
        if (
          event.key === "Enter" &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault();
          exitAfterSubmit();
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          exitAfterSubmit();
          return true;
        }
        return true;
      }

      // Connect GitHub modal: Esc closes; Enter runs Connect / Try again / open GitHub.
      if (connectGitHubOpen) {
        viewChordRef.current = null;
        if (event.key === "Escape") {
          event.preventDefault();
          setConnectGitHubOpen(false);
          return true;
        }
        if (
          event.key === "Enter" &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault();
          connectGitHubActionRef.current?.();
        }
        return true;
      }

      // Submit-review modal: Esc closes the dialog only (not the whole overlay).
      // ⌘/Ctrl+Enter submits on the compose step; ↑/↓/Enter drive the choose step.
      // Handled here because capture stopPropagation blocks element React handlers.
      if (submitReviewOpen) {
        viewChordRef.current = null;
        if (event.key === "Escape") {
          event.preventDefault();
          closeSubmitReviewModal();
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

      viewChordRef.current = null;
      if (event.key === "Escape") {
        event.preventDefault();
        if (store.composerOpen) store.closeComposer();
        return true;
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
        return true;
      }
      return true;
    }

    /** View-mode chords: v+u (unified), v+s (split). Both navigate and comment mode. */
    function handleViewModeChord(event: KeyboardEvent, store: Store): boolean {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        viewChordRef.current = null;
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

    function handleNavigateModeKeys(event: KeyboardEvent, store: Store): void {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          viewChordRef.current = null;
          requestExit();
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

    // Capture on window so we run before GitHub's document-level shortcuts.
    // The overlay mounts in an open shadow root; with focus inside it,
    // document.activeElement is the host — GitHub thinks nothing is focused
    // and would fire s/t/c/a/i/etc. Always stopPropagation so the page never
    // sees keys while the overlay is open. Only preventDefault when we consume
    // the key (so typing into the comment composer still inserts characters).
    function onKeyDown(event: KeyboardEvent): void {
      event.stopPropagation();

      if (handleTabTrap(event)) return;
      if (handleModalKeys(event)) return;

      const store = useReviewStore.getState();

      if (handleComposerKeys(event, store)) return;

      // ⌘/Ctrl+Enter opens Submit Review (or Connect GitHub if unauthenticated).
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        viewChordRef.current = null;
        void requestOpenSubmitReview();
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
    submitReviewOpen,
    connectGitHubOpen,
    submittingReview,
    submitSuccess,
    exitAfterSubmit,
    requestOpenSubmitReview,
    closeSubmitReviewModal,
    confirmationOpen,
    requestExit,
    overlayRef,
    submitModalDialogRef,
    codeColRef,
    viewChordRef,
    submitReviewActionRef,
    submitReviewKeyRef,
    connectGitHubActionRef,
    setConnectGitHubOpen,
  ]);
}
