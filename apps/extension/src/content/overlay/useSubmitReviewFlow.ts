import { useCallback, useRef, useState } from "react";
import { getGitHubAuthStatus, submitPullRequestReview } from "../../lib/messaging";
import type { PRContext } from "../../lib/types";
import { EMPTY_REVIEW_BODY_MESSAGE } from "../../lib/types";
import type { DraftComment, ReviewEvent, ReviewSubmission } from "./commentTypes";
import { mapDraftsToReviewComments } from "./mapDraftComments";
import { navigateToPrConversation } from "./prConversationUrl";

export interface SubmitSuccessInfo {
  event: ReviewEvent;
  commentCount: number;
}

interface UseSubmitReviewFlowOptions {
  prContext: PRContext | null;
  draftComments: DraftComment[];
  clearDraftComments: () => void;
  handleExit: () => void;
  overlayRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Owns the Submit Review / Connect GitHub modal flow: auth-gated open,
 * submission, success state, and post-submit exit. Extracted from Overlay
 * so the component itself stays focused on layout.
 */
export function useSubmitReviewFlow({
  prContext,
  draftComments,
  clearDraftComments,
  handleExit,
  overlayRef,
}: UseSubmitReviewFlowOptions) {
  const [submitReviewOpen, setSubmitReviewOpen] = useState(false);
  const [connectGitHubOpen, setConnectGitHubOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submitReviewError, setSubmitReviewError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<SubmitSuccessInfo | null>(null);
  /** Latest submit action from the open Submit Review modal (for ⌘/Ctrl+Enter). */
  const submitReviewActionRef = useRef<(() => void) | null>(null);
  /** Choose-step keys (↑/↓/Enter) for the open Submit Review modal. */
  const submitReviewKeyRef = useRef<((e: KeyboardEvent) => boolean) | null>(null);
  /** Primary Connect / Try again action from the open Connect GitHub modal. */
  const connectGitHubActionRef = useRef<(() => void) | null>(null);
  /** Ignore stale submit responses after the modal is closed or a newer submit. */
  const submitGenerationRef = useRef(0);
  /** Prevent double-open while auth status is in flight. */
  const authCheckInFlightRef = useRef(false);

  const exitAfterSubmit = useCallback(() => {
    setSubmitSuccess(null);
    if (prContext) {
      navigateToPrConversation(prContext);
    }
    // Post-submit exit is intentional (single CTA) — skip the confirm prompt.
    handleExit();
  }, [prContext, handleExit]);

  const closeSubmitReviewModal = useCallback(() => {
    if (submittingReview) return;
    setSubmitReviewOpen(false);
    setSubmitReviewError(null);
    // Return focus to the trigger so keyboard users are not dropped into limbo.
    requestAnimationFrame(() => {
      overlayRef.current
        ?.querySelector<HTMLElement>('[data-testid="submit-review-button"]')
        ?.focus();
    });
  }, [submittingReview, overlayRef]);

  const closeConnectGitHubModal = useCallback(() => {
    setConnectGitHubOpen(false);
  }, []);

  const openSubmitReviewModalAfterAuth = useCallback(() => {
    setConnectGitHubOpen(false);
    setSubmitReviewError(null);
    setSubmitReviewOpen(true);
  }, []);

  /**
   * Gate Submit Review on a stored GitHub token. Missing auth → connect modal;
   * after successful device OAuth the connect modal re-opens submit.
   */
  const requestOpenSubmitReview = useCallback(async () => {
    if (
      authCheckInFlightRef.current ||
      submitReviewOpen ||
      connectGitHubOpen ||
      submittingReview ||
      submitSuccess !== null
    ) {
      return;
    }

    authCheckInFlightRef.current = true;
    try {
      const status = await getGitHubAuthStatus();
      if (status.ok && status.auth) {
        setSubmitReviewError(null);
        setSubmitReviewOpen(true);
        return;
      }
      setConnectGitHubOpen(true);
    } catch {
      // Treat network/messaging failures as unauthenticated so the user can connect.
      setConnectGitHubOpen(true);
    } finally {
      authCheckInFlightRef.current = false;
    }
  }, [submitReviewOpen, connectGitHubOpen, submittingReview, submitSuccess]);

  const handleSubmitReview = useCallback(
    async (submission: ReviewSubmission) => {
      if (submittingReview) return;

      const trimmedBody = submission.body.trim();
      if (
        (submission.event === "COMMENT" || submission.event === "REQUEST_CHANGES") &&
        trimmedBody.length === 0
      ) {
        setSubmitReviewError(EMPTY_REVIEW_BODY_MESSAGE[submission.event]);
        return;
      }

      const pr = prContext;
      if (!pr) {
        setSubmitReviewError(
          "Missing pull request context. Close the review and try again from the PR page.",
        );
        return;
      }

      const generation = ++submitGenerationRef.current;
      setSubmittingReview(true);
      setSubmitReviewError(null);

      const comments = mapDraftsToReviewComments(draftComments);

      try {
        const result = await submitPullRequestReview(
          { owner: pr.owner, repo: pr.repo, number: pr.number },
          trimmedBody,
          submission.event,
          comments,
        );

        if (generation !== submitGenerationRef.current) return;

        if (!result.ok) {
          setSubmitReviewError(result.error);
          return;
        }

        clearDraftComments();
        setSubmitReviewOpen(false);
        setSubmitReviewError(null);
        setSubmitSuccess({ event: submission.event, commentCount: comments.length });
      } catch (error: unknown) {
        if (generation !== submitGenerationRef.current) return;
        const message = error instanceof Error ? error.message : "Could not submit the review.";
        setSubmitReviewError(message);
      } finally {
        if (generation === submitGenerationRef.current) {
          setSubmittingReview(false);
        }
      }
    },
    [submittingReview, prContext, draftComments, clearDraftComments],
  );

  return {
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
  };
}
