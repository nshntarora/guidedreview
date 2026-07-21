import { useEffect, useId, useRef } from "react";
import type { ReviewEvent } from "../commentTypes";
import { Button, Kbd } from "@guided-review/ui";
import { ModalShell } from "./ModalShell";

export interface ReviewSubmittedModalProps {
  open: boolean;
  event: ReviewEvent;
  /** Number of line comments included in the submitted review. */
  commentCount: number;
  onExit: () => void;
}

function eventSummary(event: ReviewEvent, commentCount: number): string {
  const commentClause =
    commentCount > 0 ? ` and left ${commentCount} comment${commentCount === 1 ? "" : "s"}` : "";

  switch (event) {
    case "APPROVE":
      return `You approved this pull request${commentClause}.`;
    case "REQUEST_CHANGES":
      return `You requested changes${commentClause}.`;
    case "COMMENT":
    default:
      return `You submitted a comment review${commentClause}.`;
  }
}

/**
 * Post-submit confirmation: success icon, what was submitted, single exit CTA.
 */
export function ReviewSubmittedModal({
  open,
  event,
  commentCount,
  onExit,
}: ReviewSubmittedModalProps) {
  const titleId = useId();
  const exitButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    exitButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <ModalShell
      scrimTestId="review-submitted-scrim"
      maxWidthClassName="max-w-[420px]"
      panelClassName="items-center px-6 py-8"
      panelProps={{
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "data-testid": "review-submitted-modal",
        "data-event": event,
        "data-comment-count": commentCount,
      }}
    >
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gr-accent text-gr-accent-on"
        data-testid="review-submitted-icon"
        aria-hidden="true"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <h2 id={titleId} className="m-0 text-center text-lg font-semibold text-gr-text">
        Review Submitted
      </h2>

      <p
        className="mt-2 mb-0 text-center text-base leading-relaxed text-gr-muted"
        data-testid="review-submitted-summary"
      >
        {eventSummary(event, commentCount)}
      </p>

      <Button
        ref={exitButtonRef}
        surface="overlay"
        className="mt-7"
        onClick={onExit}
        data-testid="review-submitted-exit"
      >
        Exit review
        <Kbd>Enter</Kbd>
      </Button>
    </ModalShell>
  );
}
