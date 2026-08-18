import { useEffect, useId, useRef, type MutableRefObject, type Ref } from "react";
import { Button, Kbd } from "@guided-review/ui";
import { useCopyToClipboard } from "@extension/lib/useCopyToClipboard";
import { CloseButton, ModalShell } from "./ModalShell";
import { ModEnterChord } from "./ShortcutKeys";

export interface GeneratePromptModalProps {
  open: boolean;
  prompt: string;
  onClose: () => void;
  /** Overlay capture keyboard: latest ⌘/Ctrl+Enter copy action. */
  copyActionRef?: MutableRefObject<(() => void) | null>;
  /** Dialog panel node for Tab focus trapping in the overlay capture handler. */
  dialogRef?: Ref<HTMLDivElement>;
}

/**
 * Local-CLI dialog: show the coding-agent prompt built from draft notes and
 * let the user copy it. The LLM never sees this text — the user pastes it.
 */
export function GeneratePromptModal({
  open,
  prompt,
  onClose,
  copyActionRef,
  dialogRef,
}: GeneratePromptModalProps) {
  const titleId = useId();
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const { copied, copy, resetCopied } = useCopyToClipboard();

  useEffect(() => {
    if (!open) {
      resetCopied();
      return;
    }
    copyButtonRef.current?.focus();
  }, [open, resetCopied]);

  useEffect(() => {
    if (!copyActionRef) return;
    if (!open || !prompt) {
      copyActionRef.current = null;
      return;
    }
    copyActionRef.current = () => {
      void copy(prompt);
    };
    return () => {
      copyActionRef.current = null;
    };
  }, [copyActionRef, open, prompt, copy]);

  if (!open) return null;

  return (
    <ModalShell
      scrimTestId="generate-prompt-scrim"
      onScrimDismiss={onClose}
      maxWidthClassName="max-w-[640px]"
      panelClassName="max-h-[min(80vh,40rem)]"
      panelRef={dialogRef}
      panelProps={{
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "data-testid": "generate-prompt-modal",
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={titleId} className="m-0 text-lg font-semibold text-foreground">
          Generate Prompt
        </h2>
        <CloseButton onClick={onClose} testId="generate-prompt-close" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="m-0 mb-3 text-base text-muted">
          Copy this into your coding agent to apply the feedback from your notes.
        </p>
        <pre
          className="m-0 whitespace-pre-wrap break-words rounded-md border border-border bg-surface px-3 py-3 font-mono text-sm leading-relaxed text-foreground"
          data-testid="generate-prompt-text"
        >
          {prompt}
        </pre>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          data-testid="generate-prompt-cancel"
        >
          Close
          <Kbd>Esc</Kbd>
        </Button>
        <Button
          ref={copyButtonRef}
          size="sm"
          onClick={() => void copy(prompt)}
          data-testid="generate-prompt-copy"
        >
          {copied ? "Copied" : "Copy"}
          {!copied ? <ModEnterChord /> : null}
        </Button>
      </div>
    </ModalShell>
  );
}
