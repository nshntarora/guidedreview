/**
 * Overlay keyboard architecture
 * -----------------------------
 * While the overlay is open we listen on `window` in the **capture** phase and
 * always `stopPropagation` so GitHub's document-level shortcuts never fire.
 *
 * Because capture + stopPropagation runs before target React handlers, real
 * keystrokes never reach element `onKeyDown` for actions we own (⌘Enter submit,
 * listbox arrows, search arrows). Modals and CommandPalette therefore register their
 * current primary actions via **mutable refs** (`submitActionRef`, `keyActionRef`,
 * `connectActionRef`, `paletteKeyRef`). Those components write the latest
 * handler into the ref each render; this hook only reads `.current`.
 *
 * Priority while a key is handled (first match wins):
 *  1. Tab trap (confirmation → submit modal → overlay)
 *  2. Modals: confirmation → success → connect-GitHub → submit-review
 *  3. ⌘/Ctrl+K actions or ⌘/Ctrl+F diff search (open or re-focus)
 *  4. ⌘/Ctrl+, local settings
 *  5. Command palette keys while the palette is open
 *  6. Comment composer / any editable (Esc, ⌘Enter save)
 *  7. ⌘/Ctrl+Enter open Submit Review
 *  8. View chords (`v` then `u`/`s`)
 *  9. Comment mode keys, else navigate mode keys (`d` scope picker)
 * Sidebar tabs (1/2) and generation (⌘/Ctrl+I) also work from sidebar controls.
 *
 * Do not redesign this as a generic keyboard framework. The ref pattern exists
 * only because capture ownership and React synthetic handlers cannot both win.
 */
import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { getConfirmationDialogElement, isConfirmationOpen } from "@guided-review/ui";
import type { SelectableLine } from "./commentTypes";
import type { DiffViewMode } from "./diffView";
import { trapTabKey } from "./focusTrap";
import { useReviewStore } from "./store";

/** Max span (ms) from arming `v` to the second key (`u` / `s`). */
export const VIEW_CHORD_WINDOW_MS = 1000;

export type ViewChordPending = { armedAt: number } | null;

/** Whether a custom select, rather than overlay navigation, owns this key. */
export function shouldLetComboboxHandleKey(state: "open" | "closed" | null, key: string): boolean {
  return state === "open" || (state === "closed" && key !== "ArrowLeft" && key !== "ArrowRight");
}

interface ViewChordResult {
  next: ViewChordPending;
  /** Non-null when the chord completed and a mode should be applied. */
  mode: DiffViewMode | null;
  /** True when this key was part of the chord (armed `v`, or completing `u`/`s`). */
  consumed: boolean;
}

/**
 * Two-key view-mode chord: `v` then `u` → unified, `v` then `s` → split.
 * Caller must filter modifiers; this only interprets the key sequence.
 */
export function recordViewChordKey(
  pending: ViewChordPending,
  key: string,
  now: number,
): ViewChordResult {
  const k = key.length === 1 ? key.toLowerCase() : key;

  if (k === "v") {
    return { next: { armedAt: now }, mode: null, consumed: true };
  }

  const armed = pending !== null && now - pending.armedAt <= VIEW_CHORD_WINDOW_MS ? pending : null;

  if (armed) {
    if (k === "u") {
      return { next: null, mode: "unified", consumed: true };
    }
    if (k === "s") {
      return { next: null, mode: "split", consumed: true };
    }
  }

  return { next: null, mode: null, consumed: false };
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
    const role = node.getAttribute("role");
    if (role === "combobox" || role === "listbox" || role === "option") return node;
  }
  return null;
}

function isEditableEvent(event: KeyboardEvent): boolean {
  return findEditableInPath(event) !== null;
}

interface UseOverlayKeyboardOptions {
  isOpen: boolean;
  /** CLI settings (or similar) is on top — leave keys alone. */
  suspended?: boolean;
  navigationDrawerRef?: RefObject<HTMLDivElement | null>;
  navigationOpen?: boolean;
  closeNavigation?: () => void;
  overlayRef: RefObject<HTMLDivElement | null>;
  submitModalDialogRef: RefObject<HTMLDivElement | null>;
  generatePromptDialogRef: RefObject<HTMLDivElement | null>;
  codeColRef: RefObject<HTMLElement | null>;
  viewChordRef: MutableRefObject<ViewChordPending>;
  selectableForUnit: SelectableLine[];
  currentUnitId: string | undefined;
  submitReviewOpen: boolean;
  generatePromptOpen: boolean;
  connectGitHubOpen: boolean;
  /** Truthy while the post-submit success modal should own the keyboard. */
  submitSuccess: object | null;
  /** Submit Review modal: latest ⌘/Ctrl+Enter submit action (compose step). */
  submitReviewActionRef: MutableRefObject<(() => void) | null>;
  /** Submit Review modal: choose-step ↑/↓/Enter handler. */
  submitReviewKeyRef: MutableRefObject<((e: KeyboardEvent) => boolean) | null>;
  /** Generate Prompt modal: latest ⌘/Ctrl+Enter copy action. */
  generatePromptCopyActionRef: MutableRefObject<(() => void) | null>;
  /** Connect GitHub modal: latest Connect / Try again / open verification URI. */
  connectGitHubActionRef: MutableRefObject<(() => void) | null>;
  exitAfterSubmit: () => void;
  requestOpenSubmitReview: () => void | Promise<void>;
  closeSubmitReviewModal: () => void;
  closeGeneratePrompt: () => void;
  setConnectGitHubOpen: (open: boolean) => void;
  confirmationOpen: boolean;
  requestExit: () => void;
  /** Action palette (⌘/Ctrl+K, ⌘/Ctrl+F) open state. */
  paletteDialogRef?: RefObject<HTMLDivElement | null>;
  paletteOpen: boolean;
  openCommands: (actionId?: string) => void;
  closePalette: () => void;
  /** Command palette: Arrow/Enter routing while the palette owns the keyboard. */
  paletteKeyRef: MutableRefObject<((e: KeyboardEvent) => boolean) | null>;
  /** Local: focus and open the diff-scope picker. */
  openScopePicker?: () => void;
  /** Generate a review plan (or connect a provider) while the CTA is available. */
  structureReview?: () => void;
  /** Local: open the settings view (⌘/Ctrl+,). */
  openSettings?: () => void;
}

/**
 * Global keyboard handling for the guided-review overlay.
 * See module comment above for capture-phase ownership and action-ref contract.
 */
export function useOverlayKeyboard({
  isOpen,
  suspended = false,
  navigationDrawerRef,
  navigationOpen = false,
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
  requestOpenSubmitReview,
  closeSubmitReviewModal,
  closeGeneratePrompt,
  setConnectGitHubOpen,
  confirmationOpen,
  requestExit,
  paletteDialogRef,
  paletteOpen,
  openCommands,
  closePalette,
  paletteKeyRef,
  openScopePicker,
  structureReview,
  openSettings,
}: UseOverlayKeyboardOptions): void {
  // Mirror modal flags into refs on every render so the capture listener never
  // sees a stale open state between React commit (modal paints) and this
  // effect re-running. Without this, Esc right after open can fall through to
  // requestExit while the modal is already visible.
  const navigationOpenRef = useRef(navigationOpen);
  navigationOpenRef.current = navigationOpen;
  const closeNavigationRef = useRef(closeNavigation);
  closeNavigationRef.current = closeNavigation;
  const submitReviewOpenRef = useRef(submitReviewOpen);
  submitReviewOpenRef.current = submitReviewOpen;
  const generatePromptOpenRef = useRef(generatePromptOpen);
  generatePromptOpenRef.current = generatePromptOpen;
  const connectGitHubOpenRef = useRef(connectGitHubOpen);
  connectGitHubOpenRef.current = connectGitHubOpen;
  const submitSuccessRef = useRef(submitSuccess);
  submitSuccessRef.current = submitSuccess;
  const exitAfterSubmitRef = useRef(exitAfterSubmit);
  exitAfterSubmitRef.current = exitAfterSubmit;
  const closeSubmitReviewModalRef = useRef(closeSubmitReviewModal);
  closeSubmitReviewModalRef.current = closeSubmitReviewModal;
  const closeGeneratePromptRef = useRef(closeGeneratePrompt);
  closeGeneratePromptRef.current = closeGeneratePrompt;
  const setConnectGitHubOpenRef = useRef(setConnectGitHubOpen);
  setConnectGitHubOpenRef.current = setConnectGitHubOpen;
  const requestOpenSubmitReviewRef = useRef(requestOpenSubmitReview);
  requestOpenSubmitReviewRef.current = requestOpenSubmitReview;
  const requestExitRef = useRef(requestExit);
  requestExitRef.current = requestExit;
  const paletteOpenRef = useRef(paletteOpen);
  paletteOpenRef.current = paletteOpen;
  const openCommandsRef = useRef(openCommands);
  openCommandsRef.current = openCommands;
  const closePaletteRef = useRef(closePalette);
  closePaletteRef.current = closePalette;
  const openScopePickerRef = useRef(openScopePicker);
  openScopePickerRef.current = openScopePicker;
  const structureReviewRef = useRef(structureReview);
  structureReviewRef.current = structureReview;
  const openSettingsRef = useRef(openSettings);
  openSettingsRef.current = openSettings;

  useEffect(() => {
    if (!isOpen || suspended) return;

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
          : generatePromptOpenRef.current
            ? generatePromptDialogRef.current
            : paletteOpenRef.current
              ? paletteDialogRef?.current
              : navigationOpenRef.current
                ? navigationDrawerRef?.current
                : overlayRef.current;
      if (trapRoot) trapTabKey(event, trapRoot);
      return true;
    }

    /**
     * Confirmation → success → connect-GitHub → generate-prompt → submit-review
     * modals, in that priority order. Each owns the key outright while open
     * (even keys it doesn't act on), so any true here means the caller should return.
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

      // Generate Prompt modal: Esc closes; ⌘/Ctrl+Enter copies the prompt.
      if (generatePromptOpenRef.current) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeGeneratePromptRef.current();
          return true;
        }
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          generatePromptCopyActionRef.current?.();
          return true;
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

      if (store.composerOpen && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        store.saveDraftComment(store.composerText, currentUnitId);
        return true;
      }
      // A restored composer stays visible without taking focus from navigation.
      if (!editable) return false;
      if (event.key === "Escape") {
        event.preventDefault();
        if (store.composerOpen) store.closeComposer();
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
        case "d":
        case "D":
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          if (!openScopePickerRef.current) return;
          event.preventDefault();
          openScopePickerRef.current();
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

    function isStructureShortcut(event: KeyboardEvent): boolean {
      return (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "i"
      );
    }

    function isSettingsShortcut(event: KeyboardEvent): boolean {
      return (
        (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key === ","
      );
    }

    // Capture on window so we run before GitHub's document-level shortcuts.
    // The overlay mounts in an open shadow root; with focus inside it,
    // document.activeElement is the host — GitHub thinks nothing is focused
    // and would fire s/t/c/a/i/etc. Always stopPropagation so the page never
    // sees keys while the overlay is open. Only preventDefault when we consume
    // the key (so typing into the comment composer still inserts characters).
    function getComboboxState(event: KeyboardEvent): "open" | "closed" | null {
      for (const node of event.composedPath()) {
        if (!(node instanceof HTMLElement)) continue;
        const role = node.getAttribute("role");
        if (role === "listbox" || role === "option") return "open";
        if (role === "combobox") {
          return node.getAttribute("aria-expanded") === "true" ? "open" : "closed";
        }
      }
      return null;
    }

    function onKeyDown(event: KeyboardEvent): void {
      // An open custom select owns its keys. A closed select keeps focus after
      // a choice, but it does not use ←/→; let those resume review navigation.
      // We still leave its other keys alone for native-like typeahead and
      // ArrowUp/ArrowDown behavior.
      const comboboxState = getComboboxState(event);
      if (!paletteOpenRef.current && shouldLetComboboxHandleKey(comboboxState, event.key)) {
        return;
      }

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
      if (
        isFindShortcut(event) ||
        ((event.metaKey || event.ctrlKey) &&
          !event.altKey &&
          !event.shiftKey &&
          event.key.toLowerCase() === "k")
      ) {
        event.preventDefault();
        clearViewChord();
        openCommandsRef.current(isFindShortcut(event) ? "search" : undefined);
        return;
      }

      // ⌘/Ctrl+,: local settings. Same priority as find so it works from the
      // composer, comment mode, and the search palette.
      if (isSettingsShortcut(event) && openSettingsRef.current) {
        event.preventDefault();
        clearViewChord();
        if (paletteOpenRef.current) closePaletteRef.current();
        openSettingsRef.current();
        return;
      }

      // Command palette owns Esc / arrows / Enter while open (above the composer so
      // Esc closes search instead of only clearing a pending composer state).
      if (paletteOpenRef.current) {
        clearViewChord();
        // Esc is handled here so close works even before CommandPalette mounts its ref.
        if (event.key === "Escape") {
          event.preventDefault();
          closePaletteRef.current();
          return;
        }
        if (paletteKeyRef.current?.(event)) {
          event.preventDefault();
          return;
        }
        // Typing into the search input: do not run navigate/comment shortcuts.
        if (isEditableEvent(event)) return;
        // Other unbound keys are swallowed while the palette is open.
        return;
      }

      if (navigationOpenRef.current && event.key === "Escape") {
        event.preventDefault();
        closeNavigationRef.current?.();
        return;
      }

      const store = useReviewStore.getState();
      if (!isEditableEvent(event)) {
        if (
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.shiftKey &&
          (event.key === "1" || event.key === "2")
        ) {
          event.preventDefault();
          clearViewChord();
          store.setNavigationMode(event.key === "1" ? "files" : "units");
          const focusTarget = navigationOpenRef.current
            ? navigationDrawerRef?.current
            : overlayRef.current;
          focusTarget?.focus({ preventScroll: true });
          return;
        }
        if (isStructureShortcut(event) && structureReviewRef.current) {
          event.preventDefault();
          clearViewChord();
          structureReviewRef.current();
          return;
        }
      }

      // Native events are retargeted across the shadow root. Handle sidebar
      // controls here because capture ownership prevents React key handlers.
      const path = event.composedPath();
      const navigation = path.find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.hasAttribute("data-review-navigation"),
      );
      const control = path.find(
        (node): node is HTMLButtonElement => node instanceof HTMLButtonElement,
      );
      if (
        navigation &&
        control &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        ["Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
          event.key,
        )
      ) {
        clearViewChord();
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          control.click();
        } else if (
          control.hasAttribute("data-file-path") &&
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
        ) {
          event.preventDefault();
          const tree = control.closest("[data-review-file-tree]");
          const rows = Array.from(
            tree?.querySelectorAll<HTMLButtonElement>("button[data-file-path]") ?? [],
          ).filter((row) => !row.closest("[inert]"));
          const index = rows.indexOf(control);
          const expanded = control.getAttribute("aria-expanded");
          let next: HTMLButtonElement | undefined;
          if (event.key === "Home") next = rows[0];
          else if (event.key === "End") next = rows[rows.length - 1];
          else if (event.key === "ArrowDown") next = rows[index + 1];
          else if (event.key === "ArrowUp") next = rows[index - 1];
          else if (event.key === "ArrowRight") {
            if (expanded === "false") control.click();
            else if (expanded === "true") next = rows[index + 1];
          } else if (expanded === "true") control.click();
          else {
            next = rows.find((row) => row.dataset.filePath === control.dataset.fileParent);
          }
          next?.focus();
          next?.scrollIntoView({ block: "nearest" });
        } else if (
          control.getAttribute("role") === "tab" &&
          ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
        ) {
          event.preventDefault();
          const tabs = Array.from(navigation.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
          const index = tabs.indexOf(control);
          const next =
            event.key === "Home"
              ? tabs[0]
              : event.key === "End"
                ? tabs[tabs.length - 1]
                : tabs[(index + 1) % tabs.length];
          next?.click();
          next?.focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const controls = Array.from(
            navigation.querySelectorAll<HTMLButtonElement>("button"),
          ).filter((row) => !row.closest("[inert]"));
          controls[controls.indexOf(control) + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
        }
        return;
      }

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

      if (store.uiMode === "comment" && !store.composerOpen) {
        handleCommentModeKeys(event, store);
        return;
      }

      handleNavigateModeKeys(event, store);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    isOpen,
    suspended,
    navigationDrawerRef,
    selectableForUnit,
    currentUnitId,
    // Modal open flags / callbacks are read from refs (updated each render) so
    // the listener is current as soon as state commits — not only after effect.
    // confirmationOpen forces a rebind when the confirm dialog mounts (Tab trap).
    confirmationOpen,
    overlayRef,
    submitModalDialogRef,
    generatePromptDialogRef,
    paletteDialogRef,
    codeColRef,
    viewChordRef,
    submitReviewActionRef,
    submitReviewKeyRef,
    generatePromptCopyActionRef,
    connectGitHubActionRef,
    paletteKeyRef,
  ]);
}
