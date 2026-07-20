import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type Ref,
} from "react";
import type { ReviewEvent, ReviewSubmission } from "../commentTypes";
import { Kbd } from "./Kbd";
import { ModEnterChord } from "./ShortcutKeys";

interface SubmitReviewModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (submission: ReviewSubmission) => void;
  /**
   * Bound to the latest submit action so the overlay capture keydown can
   * fire ⌘/Ctrl+Enter (React handlers on the textarea do not see real keys
   * after the window capture stopPropagation).
   */
  submitActionRef?: MutableRefObject<(() => void) | null>;
  /**
   * Choose-step key handler for the overlay capture path (↑/↓/Enter).
   * Returns true when the key was handled (caller should preventDefault).
   */
  keyActionRef?: MutableRefObject<((e: KeyboardEvent) => boolean) | null>;
  /** Dialog panel node for Tab focus trapping in the overlay capture handler. */
  dialogRef?: Ref<HTMLDivElement>;
}

const modalBtn =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[13px]";

const REVIEW_EVENTS: {
  value: ReviewEvent;
  label: string;
  description: string;
}[] = [
  {
    value: "COMMENT",
    label: "Comment",
    description: "Submit general feedback without explicit approval.",
  },
  {
    value: "APPROVE",
    label: "Approve",
    description: "Submit feedback and approve merging these changes.",
  },
  {
    value: "REQUEST_CHANGES",
    label: "Request Changes",
    description: "Submit feedback that must be addressed before merging.",
  },
];

type ModalStep = "choose" | "compose";

function eventIndex(event: ReviewEvent): number {
  const i = REVIEW_EVENTS.findIndex((o) => o.value === event);
  return i >= 0 ? i : 0;
}

/**
 * GitHub-style submit-review dialog: pick event type, then summary comment.
 * UI only — parent decides what to do with the submission (API later).
 */
export function SubmitReviewModal({
  open,
  onClose,
  onSubmit,
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
  // Submit only available on the compose step.
  useEffect(() => {
    if (!submitActionRef) return;
    if (!open || step !== "compose") {
      submitActionRef.current = null;
      return;
    }
    submitActionRef.current = () => onSubmit({ body, event });
    return () => {
      submitActionRef.current = null;
    };
  }, [open, step, body, event, onSubmit, submitActionRef]);

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
        setHighlight(
          (highlightIndexRef.current - 1 + REVIEW_EVENTS.length) %
            REVIEW_EVENTS.length,
        );
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
    onSubmit({ body, event });
  }

  function handleTextareaKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
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
      setHighlight(
        (highlightIndexRef.current - 1 + REVIEW_EVENTS.length) %
          REVIEW_EVENTS.length,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      confirmMode(highlightIndexRef.current);
    }
  }

  const selectedOpt =
    REVIEW_EVENTS.find((o) => o.value === event) ?? REVIEW_EVENTS[0];
  const activeOptionId = `${listboxId}-option-${highlightIndex}`;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      data-testid="submit-review-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="submit-review-modal"
        data-step={step}
        className="flex w-full max-w-[480px] flex-col rounded-lg border border-gr-border bg-gr-chrome shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gr-border px-4 py-3">
          <h2 id={titleId} className="m-0 text-[15px] font-semibold text-gr-text">
            Submit Review
          </h2>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-gr-border bg-gr-bg p-2 text-gr-muted hover:bg-gr-subtle hover:text-gr-text"
            onClick={onClose}
            aria-label="Close"
            data-testid="submit-review-close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {step === "choose" ? (
          <>
            <div className="flex flex-col gap-3 px-4 py-4">
              <p className="m-0 text-[13px] text-gr-muted">
                What would you like to do?
              </p>
              <div
                ref={listboxRef}
                role="listbox"
                id={listboxId}
                tabIndex={0}
                aria-label="Review type"
                aria-activedescendant={activeOptionId}
                data-testid="submit-review-event-list"
                className="flex flex-col gap-2 rounded-md"
                onKeyDown={handleListboxKeyDown}
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
                          ? "border-gr-accent bg-gr-subtle"
                          : "border-gr-border bg-gr-bg hover:bg-gr-subtle",
                      ].join(" ")}
                      onClick={() => confirmMode(index)}
                      onMouseEnter={() => setHighlight(index)}
                    >
                      <div className="text-[13px] font-semibold text-gr-text">
                        {opt.label}
                      </div>
                      <div className="mt-0.5 text-[12.5px] leading-snug text-gr-muted">
                        {opt.description}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-[12px] text-gr-faint">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                <span>to choose</span>
                <span className="opacity-50">·</span>
                <Kbd>Enter</Kbd>
                <span>to continue</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gr-border px-4 py-3">
              <button
                type="button"
                className={`${modalBtn} border-gr-border bg-gr-bg text-gr-muted hover:bg-gr-subtle hover:text-gr-text`}
                onClick={onClose}
                data-testid="submit-review-cancel"
              >
                Cancel
                <Kbd>Esc</Kbd>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 px-4 py-4">
              <textarea
                ref={textareaRef}
                className="min-h-[100px] w-full resize-y rounded-md border border-gr-border bg-gr-bg px-3 py-2 font-sans text-[14px] leading-relaxed text-gr-text placeholder:text-gr-faint focus:border-gr-accent"
                placeholder="Leave a comment"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                aria-label="Review comment"
                data-testid="submit-review-body"
              />

              <div
                className="rounded-md border border-gr-border bg-gr-bg px-3 py-2.5"
                data-testid="submit-review-selected-event"
                data-event={selectedOpt.value}
              >
                <div className="text-[13px] font-semibold text-gr-text">
                  {selectedOpt.label}
                </div>
                <div className="mt-0.5 text-[12.5px] leading-snug text-gr-muted">
                  {selectedOpt.description}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-gr-border px-4 py-3">
              <button
                type="button"
                className={`${modalBtn} border-gr-border bg-gr-bg text-gr-muted hover:bg-gr-subtle hover:text-gr-text`}
                onClick={goBack}
                data-testid="submit-review-back"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`${modalBtn} border-gr-border bg-gr-bg text-gr-muted hover:bg-gr-subtle hover:text-gr-text`}
                  onClick={onClose}
                  data-testid="submit-review-cancel"
                >
                  Cancel
                  <Kbd>Esc</Kbd>
                </button>
                <button
                  type="button"
                  className={`${modalBtn} border-gr-accent bg-gr-accent font-medium text-gr-accent-on hover:border-gr-accent-hover hover:bg-gr-accent-hover [&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit`}
                  onClick={handleSubmit}
                  data-testid="submit-review-confirm"
                >
                  Submit Review
                  <ModEnterChord />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
