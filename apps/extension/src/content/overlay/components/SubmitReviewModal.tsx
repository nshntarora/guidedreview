import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type Ref,
  type RefObject,
} from "react";
import type { ReviewEvent, ReviewSubmission } from "@extension/content/overlay/commentTypes";
import { Button, Kbd, KbdGroup, Textarea } from "@guided-review/ui";
import { CloseButton, ModalShell } from "./ModalShell";
import { ModEnterChord } from "./ShortcutKeys";

interface SubmitReviewModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (submission: ReviewSubmission) => void;
  /** True while the GitHub API request is in flight. */
  submitting?: boolean;
  /** User-facing error from the last submit attempt. */
  error?: string | null;
  /**
   * Action-ref for overlay capture keyboard (see useOverlayKeyboard module
   * comment). Latest ⌘/Ctrl+Enter submit — element React handlers never see
   * real keys after window capture stopPropagation.
   */
  submitActionRef?: MutableRefObject<(() => void) | null>;
  /**
   * Action-ref for overlay capture keyboard: choose-step ↑/↓/Enter.
   * Returns true when the key was handled (caller should preventDefault).
   */
  keyActionRef?: MutableRefObject<((e: KeyboardEvent) => boolean) | null>;
  /** Dialog panel node for Tab focus trapping in the overlay capture handler. */
  dialogRef?: Ref<HTMLDivElement>;
}

const REVIEW_EVENTS: {
  value: ReviewEvent;
  label: string;
  description: string;
}[] = [
  {
    value: "COMMENT",
    label: "Comment",
    description: "General feedback without approving or requesting changes.",
  },
  {
    value: "APPROVE",
    label: "Approve",
    description: "Approve these changes for merge. Optional summary.",
  },
  {
    value: "REQUEST_CHANGES",
    label: "Request Changes",
    description: "Require changes before merge. Summary required.",
  },
];

type ModalStep = "choose" | "compose";

function eventIndex(event: ReviewEvent): number {
  const i = REVIEW_EVENTS.findIndex((o) => o.value === event);
  return i >= 0 ? i : 0;
}

interface ChooseReviewEventStepProps {
  listboxId: string;
  listboxRef: RefObject<HTMLDivElement | null>;
  highlightIndex: number;
  onHighlight: (index: number) => void;
  onConfirm: (index: number) => void;
  onClose: () => void;
  onListboxKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
}

/** Step 1: pick COMMENT / APPROVE / REQUEST_CHANGES. */
function ChooseReviewEventStep({
  listboxId,
  listboxRef,
  highlightIndex,
  onHighlight,
  onConfirm,
  onClose,
  onListboxKeyDown,
}: ChooseReviewEventStepProps) {
  const activeOptionId = `${listboxId}-option-${highlightIndex}`;

  return (
    <>
      <div className="flex flex-col gap-3 px-4 py-4">
        <p className="m-0 text-base text-muted">Choose a review type.</p>
        <div
          ref={listboxRef}
          role="listbox"
          id={listboxId}
          tabIndex={0}
          aria-label="Review type"
          aria-activedescendant={activeOptionId}
          data-testid="submit-review-event-list"
          className="flex flex-col gap-2 rounded-md outline-none"
          onKeyDown={onListboxKeyDown}
        >
          {REVIEW_EVENTS.map((opt, index) => {
            const highlighted = highlightIndex === index;
            return (
              <div
                key={opt.value}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={highlighted}
                data-testid={`submit-review-event-${opt.value}`}
                className={[
                  "cursor-pointer rounded-md border px-3 py-2.5 transition-colors",
                  highlighted
                    ? "border-primary bg-surface-muted"
                    : "border-border bg-surface hover:bg-surface-muted",
                ].join(" ")}
                onClick={() => onConfirm(index)}
                onMouseEnter={() => onHighlight(index)}
              >
                <div className="text-base font-semibold text-foreground">{opt.label}</div>
                <div className="mt-0.5 text-sm leading-snug text-muted">{opt.description}</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-sm text-faint">
          <KbdGroup>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </KbdGroup>
          <span>to choose</span>
          <span className="opacity-50">·</span>
          <Kbd>Enter</Kbd>
          <span>to continue</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button variant="secondary" size="sm" onClick={onClose} data-testid="submit-review-cancel">
          Cancel
          <Kbd>Esc</Kbd>
        </Button>
      </div>
    </>
  );
}

interface ComposeReviewStepProps {
  body: string;
  onBodyChange: (body: string) => void;
  selectedLabel: string;
  selectedDescription: string;
  selectedEvent: ReviewEvent;
  error: string | null;
  submitting: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onTextareaKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onBack: () => void;
  onClose: () => void;
  onSubmit: () => void;
}

/** Step 2: summary body + confirm selected review type. */
function ComposeReviewStep({
  body,
  onBodyChange,
  selectedLabel,
  selectedDescription,
  selectedEvent,
  error,
  submitting,
  textareaRef,
  onTextareaKeyDown,
  onBack,
  onClose,
  onSubmit,
}: ComposeReviewStepProps) {
  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-4">
        <Textarea
          ref={textareaRef}
          className="min-h-[100px]"
          placeholder="Review summary (markdown supported)…"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          onKeyDown={onTextareaKeyDown}
          disabled={submitting}
          aria-label="Review comment"
          data-testid="submit-review-body"
        />

        <div
          className="rounded-md border border-border bg-surface px-3 py-2.5"
          data-testid="submit-review-selected-event"
          data-event={selectedEvent}
        >
          <div className="text-base font-semibold text-foreground">{selectedLabel}</div>
          <div className="mt-0.5 text-sm leading-snug text-muted">{selectedDescription}</div>
        </div>

        {error ? (
          <p
            className="m-0 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-base leading-snug text-red-200"
            role="alert"
            data-testid="submit-review-error"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onBack}
          disabled={submitting}
          data-testid="submit-review-back"
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            data-testid="submit-review-cancel"
          >
            Cancel
            <Kbd>Esc</Kbd>
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={submitting}
            data-testid="submit-review-confirm"
          >
            {submitting ? "Submitting…" : "Submit Review"}
            {!submitting ? <ModEnterChord /> : null}
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * GitHub-style submit-review dialog: pick event type, then summary comment.
 * Parent posts the submission to GitHub via the background worker.
 */
export function SubmitReviewModal({
  open,
  onClose,
  onSubmit,
  submitting = false,
  error = null,
  submitActionRef,
  keyActionRef,
  dialogRef,
}: SubmitReviewModalProps) {
  const titleId = useId();
  const listboxId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<ModalStep>("choose");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const highlightIndexRef = useRef(0);
  const [body, setBody] = useState("");
  const [event, setEvent] = useState<ReviewEvent>("COMMENT");

  function setHighlight(index: number): void {
    highlightIndexRef.current = index;
    setHighlightIndex(index);
  }

  function confirmMode(index: number): void {
    const opt = REVIEW_EVENTS[index] ?? REVIEW_EVENTS[0];
    setEvent(opt.value);
    setHighlight(index);
    setStep("compose");
  }

  function goBack(): void {
    setHighlight(eventIndex(event));
    setStep("choose");
  }

  // Reset form when opened.
  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setHighlight(0);
    setBody("");
    setEvent("COMMENT");
  }, [open]);

  // Focus listbox on choose step; textarea on compose.
  useEffect(() => {
    if (!open) return;
    if (step === "choose") {
      listboxRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  }, [open, step]);

  // Keep the overlay capture path pointed at the current form values.
  // Submit only available on the compose step while not in-flight.
  useEffect(() => {
    if (!submitActionRef) return;
    if (!open || step !== "compose" || submitting) {
      submitActionRef.current = null;
      return;
    }
    submitActionRef.current = () => onSubmit({ body, event });
    return () => {
      submitActionRef.current = null;
    };
  }, [open, step, body, event, onSubmit, submitActionRef, submitting]);

  // Choose-step keys via overlay capture (real keystrokes never reach React handlers).
  // highlightIndexRef keeps Enter accurate across sequential keys before re-render.
  useEffect(() => {
    if (!keyActionRef) return;
    if (!open || step !== "choose") {
      keyActionRef.current = null;
      return;
    }
    keyActionRef.current = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return false;
      if (e.key === "ArrowDown") {
        setHighlight((highlightIndexRef.current + 1) % REVIEW_EVENTS.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        setHighlight((highlightIndexRef.current - 1 + REVIEW_EVENTS.length) % REVIEW_EVENTS.length);
        return true;
      }
      if (e.key === "Enter") {
        confirmMode(highlightIndexRef.current);
        return true;
      }
      return false;
    };
    return () => {
      keyActionRef.current = null;
    };
  }, [open, step, keyActionRef]);

  if (!open) return null;

  function handleSubmit(): void {
    if (submitting) return;
    onSubmit({ body, event });
  }

  function handleTextareaKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (!submitting) onClose();
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  }

  /** Element-level keys for tests / when focus is on the listbox without capture. */
  function handleListboxKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setHighlight((highlightIndexRef.current + 1) % REVIEW_EVENTS.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setHighlight((highlightIndexRef.current - 1 + REVIEW_EVENTS.length) % REVIEW_EVENTS.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      confirmMode(highlightIndexRef.current);
    }
  }

  const selectedOpt = REVIEW_EVENTS.find((o) => o.value === event) ?? REVIEW_EVENTS[0];

  return (
    <ModalShell
      scrimTestId="submit-review-scrim"
      onScrimDismiss={submitting ? undefined : onClose}
      maxWidthClassName="max-w-[480px]"
      panelRef={dialogRef}
      panelProps={{
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "data-testid": "submit-review-modal",
        "data-step": step,
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={titleId} className="m-0 text-lg font-semibold text-foreground">
          Submit Review
        </h2>
        <CloseButton onClick={onClose} disabled={submitting} testId="submit-review-close" />
      </div>

      {step === "choose" ? (
        <ChooseReviewEventStep
          listboxId={listboxId}
          listboxRef={listboxRef}
          highlightIndex={highlightIndex}
          onHighlight={setHighlight}
          onConfirm={confirmMode}
          onClose={onClose}
          onListboxKeyDown={handleListboxKeyDown}
        />
      ) : (
        <ComposeReviewStep
          body={body}
          onBodyChange={setBody}
          selectedLabel={selectedOpt.label}
          selectedDescription={selectedOpt.description}
          selectedEvent={selectedOpt.value}
          error={error}
          submitting={submitting}
          textareaRef={textareaRef}
          onTextareaKeyDown={handleTextareaKeyDown}
          onBack={goBack}
          onClose={onClose}
          onSubmit={handleSubmit}
        />
      )}
    </ModalShell>
  );
}
