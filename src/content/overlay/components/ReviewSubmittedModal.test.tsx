import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewSubmittedModal } from "./ReviewSubmittedModal";

describe("ReviewSubmittedModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <ReviewSubmittedModal
        open={false}
        event="APPROVE"
        commentCount={0}
        onExit={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the success title and check icon", () => {
    render(
      <ReviewSubmittedModal
        open
        event="APPROVE"
        commentCount={0}
        onExit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Review Submitted" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("review-submitted-icon")).toBeInTheDocument();
    expect(screen.getByTestId("review-submitted-modal")).toHaveAttribute(
      "data-event",
      "APPROVE",
    );
  });

  it("summarizes an approval without line comments", () => {
    render(
      <ReviewSubmittedModal
        open
        event="APPROVE"
        commentCount={0}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("review-submitted-summary")).toHaveTextContent(
      "You approved this pull request.",
    );
  });

  it("summarizes approval with a singular comment count", () => {
    render(
      <ReviewSubmittedModal
        open
        event="APPROVE"
        commentCount={1}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("review-submitted-summary")).toHaveTextContent(
      "You approved this pull request and left 1 comment.",
    );
  });

  it("summarizes a comment review with plural comments", () => {
    render(
      <ReviewSubmittedModal
        open
        event="COMMENT"
        commentCount={3}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("review-submitted-summary")).toHaveTextContent(
      "You submitted a comment review and left 3 comments.",
    );
  });

  it("summarizes requested changes without comments", () => {
    render(
      <ReviewSubmittedModal
        open
        event="REQUEST_CHANGES"
        commentCount={0}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("review-submitted-summary")).toHaveTextContent(
      "You requested changes.",
    );
  });

  it("summarizes requested changes with comments", () => {
    render(
      <ReviewSubmittedModal
        open
        event="REQUEST_CHANGES"
        commentCount={2}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("review-submitted-summary")).toHaveTextContent(
      "You requested changes and left 2 comments.",
    );
  });

  it("calls onExit from the primary button", () => {
    const onExit = vi.fn();
    render(
      <ReviewSubmittedModal
        open
        event="APPROVE"
        commentCount={0}
        onExit={onExit}
      />,
    );
    fireEvent.click(screen.getByTestId("review-submitted-exit"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("focuses the exit button when opened", () => {
    render(
      <ReviewSubmittedModal
        open
        event="APPROVE"
        commentCount={0}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("review-submitted-exit")).toHaveFocus();
  });

  it("does not call onExit when clicking the scrim", () => {
    const onExit = vi.fn();
    render(
      <ReviewSubmittedModal
        open
        event="APPROVE"
        commentCount={0}
        onExit={onExit}
      />,
    );
    fireEvent.click(screen.getByTestId("review-submitted-scrim"));
    expect(onExit).not.toHaveBeenCalled();
  });
});
