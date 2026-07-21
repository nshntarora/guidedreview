import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "../../../lib/cn";
import { Kbd } from "./Kbd";

export type ConfirmVariant = "primary" | "destructive";

export interface ConfirmOptions {
  title: string;
  /** Description; string or rich content. */
  body: ReactNode;
  okButtonText?: string;
  cancelButtonText?: string;
  variant?: ConfirmVariant;
  okButtonHandler: () => void | Promise<void>;
  cancelButtonHandler?: () => void | Promise<void>;
}

interface QueuedConfirmation {
  id: string;
  options: Required<
    Pick<ConfirmOptions, "okButtonText" | "cancelButtonText" | "variant">
  > &
    ConfirmOptions;
}

// ── Module queue + subscribers (abstractions-style imperative API) ─────────

let confirmationQueue: QueuedConfirmation[] = [];
const queueListeners = new Set<() => void>();
const openListeners = new Set<() => void>();

let dialogElement: HTMLElement | null = null;
let okAction: (() => void) | null = null;
let cancelAction: (() => void) | null = null;

function notifyQueue(): void {
  for (const l of queueListeners) l();
}

function notifyOpen(): void {
  for (const l of openListeners) l();
}

function getSnapshot(): QueuedConfirmation[] {
  return confirmationQueue;
}

function subscribe(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => {
    queueListeners.delete(listener);
  };
}

function getOpenSnapshot(): boolean {
  return confirmationQueue.length > 0;
}

function subscribeOpen(listener: () => void): () => void {
  openListeners.add(listener);
  return () => {
    openListeners.delete(listener);
  };
}

function enqueue(options: ConfirmOptions): void {
  const id = `confirm-${Math.random().toString(36).slice(2, 11)}`;
  confirmationQueue = [
    ...confirmationQueue,
    {
      id,
      options: {
        variant: "primary",
        okButtonText: "Confirm",
        cancelButtonText: "Cancel",
        ...options,
      },
    },
  ];
  notifyQueue();
  notifyOpen();
}

function dequeueHead(): void {
  if (confirmationQueue.length === 0) return;
  confirmationQueue = confirmationQueue.slice(1);
  notifyQueue();
  notifyOpen();
}

/**
 * Open a confirmation dialog. The host must be mounted (e.g. under Overlay).
 * Handlers run when the user chooses OK or Cancel.
 */
export function confirm(options: ConfirmOptions): void {
  enqueue(options);
}

/** Whether a confirmation dialog is currently queued/visible. */
export function isConfirmationOpen(): boolean {
  return confirmationQueue.length > 0;
}

/**
 * Subscribe to open/closed state so Overlay can rebind keyboard / Tab trap.
 * Uses useSyncExternalStore against the module queue.
 */
export function useConfirmationOpen(): boolean {
  return useSyncExternalStore(subscribeOpen, getOpenSnapshot, getOpenSnapshot);
}

/** Dialog panel element for Tab focus trapping (null when closed). */
export function getConfirmationDialogElement(): HTMLElement | null {
  return dialogElement;
}

/**
 * Handle overlay-level keyboard when a confirmation is open.
 * Returns true if the event was consumed (caller should preventDefault / return).
 */
export function confirmationHandlesKey(event: KeyboardEvent): boolean {
  if (confirmationQueue.length === 0) return false;

  if (event.key === "Escape") {
    cancelAction?.();
    return true;
  }

  if (
    event.key === "Enter" &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  ) {
    okAction?.();
    return true;
  }

  return false;
}

/** Test helper: drain the queue without running handlers. */
export function resetConfirmationQueueForTests(): void {
  const hadItems = confirmationQueue.length > 0;
  confirmationQueue = [];
  dialogElement = null;
  okAction = null;
  cancelAction = null;
  // Only notify when something was cleared — avoids noisy re-renders in parallel tests.
  if (hadItems) {
    notifyQueue();
    notifyOpen();
  }
}

// ── Dialog UI ──────────────────────────────────────────────────────────────

const secondaryBtn =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gr-border bg-gr-bg px-3 py-1.5 text-base text-gr-muted hover:bg-gr-subtle hover:text-gr-text disabled:cursor-not-allowed disabled:opacity-50";

const primaryOkBtn =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gr-accent bg-gr-accent px-3 py-1.5 text-base font-medium text-gr-accent-on hover:border-gr-accent-hover hover:bg-gr-accent-hover disabled:cursor-not-allowed disabled:opacity-50 [&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit";

const destructiveOkBtn =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gr-danger bg-gr-danger-subtle px-3 py-1.5 text-base font-medium text-gr-danger hover:bg-[rgba(255,123,114,0.2)] disabled:cursor-not-allowed disabled:opacity-50";

interface ConfirmationDialogProps {
  title: string;
  body: ReactNode;
  okButtonText: string;
  cancelButtonText: string;
  variant: ConfirmVariant;
  okButtonHandler: () => void | Promise<void>;
  cancelButtonHandler?: () => void | Promise<void>;
  onClose: () => void;
}

function ConfirmationDialog({
  title,
  body,
  okButtonText,
  cancelButtonText,
  variant,
  okButtonHandler,
  cancelButtonHandler,
  onClose,
}: ConfirmationDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  // Keep latest handlers without re-registering keyboard actions every render.
  const okHandlerRef = useRef(okButtonHandler);
  const cancelHandlerRef = useRef(cancelButtonHandler);
  const onCloseRef = useRef(onClose);
  okHandlerRef.current = okButtonHandler;
  cancelHandlerRef.current = cancelButtonHandler;
  onCloseRef.current = onClose;

  const settledRef = useRef(false);

  const handleOk = useCallback(async () => {
    if (isLoadingRef.current || settledRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      await okHandlerRef.current();
      settledRef.current = true;
      onCloseRef.current();
    } catch (error) {
      console.error("Confirmation okButtonHandler error:", error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const handleCancel = useCallback(async () => {
    if (isLoadingRef.current || settledRef.current) return;
    settledRef.current = true;
    try {
      await cancelHandlerRef.current?.();
    } catch (error) {
      console.error("Confirmation cancelButtonHandler error:", error);
    }
    onCloseRef.current();
  }, []);

  // Register dialog + actions for overlay keyboard / Tab trap.
  useEffect(() => {
    dialogElement = dialogRef.current;
    okAction = () => {
      void handleOk();
    };
    cancelAction = () => {
      void handleCancel();
    };
    return () => {
      if (dialogElement === dialogRef.current) dialogElement = null;
      okAction = null;
      cancelAction = null;
    };
  }, [handleOk, handleCancel]);

  // Own capture listener so Enter/Esc work outside the overlay (e.g. options page).
  // Overlay also routes keys via confirmationHandlesKey; settledRef prevents double-fire.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        void handleCancel();
        return;
      }
      if (
        event.key === "Enter" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        void handleOk();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [handleOk, handleCancel]);

  // Focus Cancel on open (safer for destructive confirms).
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      data-testid="confirmation-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          void handleCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-testid="confirmation-dialog"
        data-variant={variant}
        className="flex w-full max-w-[420px] flex-col rounded-lg border border-gr-border bg-gr-chrome shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2 px-4 py-4">
          <h2 id={titleId} className="m-0 text-lg font-semibold text-gr-text">
            {title}
          </h2>
          <div id={bodyId} className="m-0 text-base leading-relaxed text-gr-muted">
            {typeof body === "string" ? <p className="m-0">{body}</p> : body}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gr-border px-4 py-3">
          <button
            ref={cancelRef}
            type="button"
            className={secondaryBtn}
            onClick={() => void handleCancel()}
            disabled={isLoading}
            data-testid="confirmation-cancel"
          >
            {cancelButtonText}
            <Kbd>Esc</Kbd>
          </button>
          <button
            type="button"
            className={cn(variant === "destructive" ? destructiveOkBtn : primaryOkBtn)}
            onClick={() => void handleOk()}
            disabled={isLoading}
            data-testid="confirmation-ok"
          >
            {isLoading ? "Processing…" : okButtonText}
            {!isLoading && <Kbd>Enter</Kbd>}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mount once under the guided review overlay (or any React root that needs confirms).
 * Renders the head of the confirmation queue.
 */
export function ConfirmationHost() {
  const queue = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const head = queue[0] ?? null;

  if (!head) return null;

  const { options, id } = head;

  return (
    <ConfirmationDialog
      key={id}
      title={options.title}
      body={options.body}
      okButtonText={options.okButtonText}
      cancelButtonText={options.cancelButtonText}
      variant={options.variant}
      okButtonHandler={options.okButtonHandler}
      cancelButtonHandler={options.cancelButtonHandler}
      onClose={dequeueHead}
    />
  );
}
