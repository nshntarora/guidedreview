import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Button, Kbd } from "@guided-review/ui";
import { ModalShell } from "./ModalShell";

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
  options: Required<Pick<ConfirmOptions, "okButtonText" | "cancelButtonText" | "variant">> &
    ConfirmOptions;
}

// ── Module queue + subscribers (abstractions-style imperative API) ─────────

let confirmationQueue: QueuedConfirmation[] = [];
const queueListeners = new Set<() => void>();
const openListeners = new Set<() => void>();

let dialogElement: HTMLElement | null = null;

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

/** Test helper: drain the queue without running handlers. */
export function resetConfirmationQueueForTests(): void {
  const hadItems = confirmationQueue.length > 0;
  confirmationQueue = [];
  dialogElement = null;
  // Only notify when something was cleared — avoids noisy re-renders in parallel tests.
  if (hadItems) {
    notifyQueue();
    notifyOpen();
  }
}

// ── Dialog UI ──────────────────────────────────────────────────────────────

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

  /** Set once the dialog has resolved, so a second Enter/Esc can't re-run a handler. */
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

  // Register the panel element for the overlay's Tab focus trap.
  useEffect(() => {
    const panel = dialogRef.current;
    dialogElement = panel;
    return () => {
      // Only clear if a newer dialog hasn't already claimed the slot.
      if (dialogElement === panel) dialogElement = null;
    };
  }, []);

  // Sole Enter/Esc handler for the dialog. Capture phase so it works both under
  // the overlay (which stops propagation on every key) and on the options page,
  // where there is no overlay keyboard at all.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        void handleCancel();
        return;
      }
      if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.altKey) {
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
    <ModalShell
      position="fixed"
      zIndexClassName="z-[60]"
      scrimTestId="confirmation-scrim"
      onScrimDismiss={isLoading ? undefined : () => void handleCancel()}
      maxWidthClassName="max-w-[420px]"
      panelRef={dialogRef}
      panelProps={{
        role: "alertdialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "aria-describedby": bodyId,
        "data-testid": "confirmation-dialog",
        "data-variant": variant,
      }}
    >
      <div className="flex flex-col gap-2 px-4 py-4">
        <h2 id={titleId} className="m-0 text-lg font-semibold text-foreground">
          {title}
        </h2>
        <div id={bodyId} className="m-0 text-base leading-relaxed text-muted">
          {typeof body === "string" ? <p className="m-0">{body}</p> : body}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          ref={cancelRef}
          variant="secondary"
          size="sm"
          onClick={() => void handleCancel()}
          disabled={isLoading}
          data-testid="confirmation-cancel"
        >
          {cancelButtonText}
          <Kbd>Esc</Kbd>
        </Button>
        <Button
          variant={variant === "destructive" ? "destructive" : "primary"}
          size="sm"
          onClick={() => void handleOk()}
          disabled={isLoading}
          data-testid="confirmation-ok"
        >
          {isLoading ? "Processing…" : okButtonText}
          {!isLoading && <Kbd>Enter</Kbd>}
        </Button>
      </div>
    </ModalShell>
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
