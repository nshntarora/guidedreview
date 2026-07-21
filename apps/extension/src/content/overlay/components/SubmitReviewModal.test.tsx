import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmitReviewModal } from "./SubmitReviewModal";

/** Advance from choose step to compose by clicking Comment (default option). */
function selectCommentAndCompose(): void {
  fireEvent.click(screen.getByTestId("submit-review-event-COMMENT"));
}

describe("SubmitReviewModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <SubmitReviewModal open={false} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens on the choose step with the three review modes", () => {
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByTestId("submit-review-modal")).toBeInTheDocument();
    expect(screen.getByTestId("submit-review-modal")).toHaveAttribute("data-step", "choose");
    expect(screen.getByRole("dialog", { name: "Submit Review" })).toBeInTheDocument();
    expect(screen.queryByTestId("submit-review-body")).not.toBeInTheDocument();
    expect(screen.getByText("Choose a review type.")).toBeInTheDocument();
    expect(screen.getByText("Comment")).toBeInTheDocument();
    expect(
      screen.getByText("General feedback without approving or requesting changes."),
    ).toBeInTheDocument();
    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(
      screen.getByText("Approve these changes for merge. Optional summary."),
    ).toBeInTheDocument();
    expect(screen.getByText("Request Changes")).toBeInTheDocument();
    expect(screen.getByText("Require changes before merge. Summary required.")).toBeInTheDocument();
    expect(screen.queryByTestId("submit-review-confirm")).not.toBeInTheDocument();
  });

  it("highlights Comment by default and focuses the listbox", () => {
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByTestId("submit-review-event-COMMENT")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("submit-review-event-APPROVE")).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByTestId("submit-review-event-list")).toHaveFocus();
  });

  it("moves highlight with ArrowDown and ArrowUp", () => {
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    const list = screen.getByTestId("submit-review-event-list");
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(screen.getByTestId("submit-review-event-APPROVE")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(screen.getByTestId("submit-review-event-REQUEST_CHANGES")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(screen.getByTestId("submit-review-event-COMMENT")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(list, { key: "ArrowUp" });
    expect(screen.getByTestId("submit-review-event-REQUEST_CHANGES")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("advances to compose on Enter with the highlighted mode", () => {
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    const list = screen.getByTestId("submit-review-event-list");
    fireEvent.keyDown(list, { key: "ArrowDown" });
    fireEvent.keyDown(list, { key: "Enter" });

    expect(screen.getByTestId("submit-review-modal")).toHaveAttribute("data-step", "compose");
    expect(screen.getByTestId("submit-review-body")).toBeInTheDocument();
    expect(screen.getByTestId("submit-review-body")).toHaveFocus();
    expect(screen.getByTestId("submit-review-selected-event")).toHaveAttribute(
      "data-event",
      "APPROVE",
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("advances to compose when clicking a mode option", () => {
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("submit-review-event-REQUEST_CHANGES"));

    expect(screen.getByTestId("submit-review-selected-event")).toHaveAttribute(
      "data-event",
      "REQUEST_CHANGES",
    );
    expect(screen.getByTestId("submit-review-body")).toBeInTheDocument();
  });

  it("submits body and selected event from compose", () => {
    const onSubmit = vi.fn();
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
    fireEvent.change(screen.getByTestId("submit-review-body"), {
      target: { value: "LGTM with nits" },
    });
    fireEvent.click(screen.getByTestId("submit-review-confirm"));

    expect(onSubmit).toHaveBeenCalledWith({
      body: "LGTM with nits",
      event: "APPROVE",
    });
  });

  it("allows empty body on submit (GitHub behavior)", () => {
    const onSubmit = vi.fn();
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={onSubmit} />);

    selectCommentAndCompose();
    fireEvent.click(screen.getByTestId("submit-review-confirm"));
    expect(onSubmit).toHaveBeenCalledWith({ body: "", event: "COMMENT" });
  });

  it("Back returns to choose, keeps body, and restores highlight", () => {
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
    fireEvent.change(screen.getByTestId("submit-review-body"), {
      target: { value: "draft notes" },
    });
    fireEvent.click(screen.getByTestId("submit-review-back"));

    expect(screen.getByTestId("submit-review-modal")).toHaveAttribute("data-step", "choose");
    expect(screen.getByTestId("submit-review-event-APPROVE")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByTestId("submit-review-body")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
    expect(screen.getByTestId("submit-review-body")).toHaveValue("draft notes");
  });

  it("can change mode after going back", () => {
    const onSubmit = vi.fn();
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
    fireEvent.click(screen.getByTestId("submit-review-back"));
    fireEvent.click(screen.getByTestId("submit-review-event-REQUEST_CHANGES"));
    fireEvent.click(screen.getByTestId("submit-review-confirm"));

    expect(onSubmit).toHaveBeenCalledWith({
      body: "",
      event: "REQUEST_CHANGES",
    });
  });

  it("calls onClose from Cancel on choose step", () => {
    const onClose = vi.fn();
    render(<SubmitReviewModal open onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("submit-review-cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose from Cancel on compose step", () => {
    const onClose = vi.fn();
    render(<SubmitReviewModal open onClose={onClose} onSubmit={vi.fn()} />);

    selectCommentAndCompose();
    fireEvent.click(screen.getByTestId("submit-review-cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking the scrim", () => {
    const onClose = vi.fn();
    render(<SubmitReviewModal open onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("submit-review-scrim"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when clicking inside the dialog", () => {
    const onClose = vi.fn();
    render(<SubmitReviewModal open onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("submit-review-modal"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape from the listbox", () => {
    const onClose = vi.fn();
    render(<SubmitReviewModal open onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.keyDown(screen.getByTestId("submit-review-event-list"), {
      key: "Escape",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape from the textarea", () => {
    const onClose = vi.fn();
    render(<SubmitReviewModal open onClose={onClose} onSubmit={vi.fn()} />);

    selectCommentAndCompose();
    fireEvent.keyDown(screen.getByTestId("submit-review-body"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("submits with Ctrl+Enter from the textarea", () => {
    const onSubmit = vi.fn();
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
    fireEvent.change(screen.getByTestId("submit-review-body"), {
      target: { value: "Ship it" },
    });
    fireEvent.keyDown(screen.getByTestId("submit-review-body"), {
      key: "Enter",
      ctrlKey: true,
    });

    expect(onSubmit).toHaveBeenCalledWith({
      body: "Ship it",
      event: "APPROVE",
    });
  });

  it("submits with meta+Enter from the textarea", () => {
    const onSubmit = vi.fn();
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={onSubmit} />);

    selectCommentAndCompose();
    fireEvent.keyDown(screen.getByTestId("submit-review-body"), {
      key: "Enter",
      metaKey: true,
    });

    expect(onSubmit).toHaveBeenCalledWith({ body: "", event: "COMMENT" });
  });

  it("does not use radio inputs for review modes", () => {
    render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByTestId("submit-review-event-COMMENT").querySelector("input")).toBeNull();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows an error and disables submit while submitting", () => {
    const onSubmit = vi.fn();
    render(
      <SubmitReviewModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        submitting
        error="Connect GitHub first."
      />,
    );

    selectCommentAndCompose();
    expect(screen.getByTestId("submit-review-error")).toHaveTextContent("Connect GitHub first.");
    expect(screen.getByTestId("submit-review-confirm")).toBeDisabled();
    expect(screen.getByTestId("submit-review-confirm")).toHaveTextContent("Submitting…");
    fireEvent.click(screen.getByTestId("submit-review-confirm"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("resets to choose step when reopened", () => {
    const { rerender } = render(<SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("submit-review-event-REQUEST_CHANGES"));
    fireEvent.change(screen.getByTestId("submit-review-body"), {
      target: { value: "draft notes" },
    });

    rerender(<SubmitReviewModal open={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    rerender(<SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByTestId("submit-review-modal")).toHaveAttribute("data-step", "choose");
    expect(screen.getByTestId("submit-review-event-COMMENT")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByTestId("submit-review-body")).not.toBeInTheDocument();
  });

  it("registers keyActionRef for choose-step capture handling", () => {
    const keyActionRef = { current: null as ((e: KeyboardEvent) => boolean) | null };
    render(
      <SubmitReviewModal open onClose={vi.fn()} onSubmit={vi.fn()} keyActionRef={keyActionRef} />,
    );

    expect(keyActionRef.current).not.toBeNull();
    act(() => {
      expect(keyActionRef.current!(new KeyboardEvent("keydown", { key: "ArrowDown" }))).toBe(true);
    });
    expect(screen.getByTestId("submit-review-event-APPROVE")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    act(() => {
      expect(keyActionRef.current!(new KeyboardEvent("keydown", { key: "Enter" }))).toBe(true);
    });
    expect(screen.getByTestId("submit-review-modal")).toHaveAttribute("data-step", "compose");
    expect(keyActionRef.current).toBeNull();
  });

  it("only sets submitActionRef on the compose step", () => {
    const submitActionRef = { current: null as (() => void) | null };
    const onSubmit = vi.fn();
    render(
      <SubmitReviewModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        submitActionRef={submitActionRef}
      />,
    );

    expect(submitActionRef.current).toBeNull();

    selectCommentAndCompose();
    expect(submitActionRef.current).not.toBeNull();
    submitActionRef.current!();
    expect(onSubmit).toHaveBeenCalledWith({ body: "", event: "COMMENT" });
  });
});
