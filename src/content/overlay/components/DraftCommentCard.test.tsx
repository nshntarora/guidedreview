import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DraftComment } from "../commentTypes";
import { DraftCommentCard } from "./DraftCommentCard";

const draft: DraftComment = {
  id: "draft-1",
  filePath: "src/foo.ts",
  side: "RIGHT",
  startLine: 2,
  endLine: 4,
  lineIds: ["a", "b"],
  body: "Looks good",
};

describe("DraftCommentCard", () => {
  it("renders the body in sans text-base and shows Edit / Remove", () => {
    render(
      <DraftCommentCard comment={draft} onRemove={vi.fn()} onUpdate={vi.fn()} />,
    );

    const body = screen.getByTestId("draft-comment-body");
    expect(body).toHaveTextContent("Looks good");
    expect(body.className).toMatch(/font-sans/);
    expect(body.className).toMatch(/\btext-base\b/);
    expect(screen.getByTestId("draft-comment-edit")).toBeInTheDocument();
    expect(screen.getByTestId("draft-comment-remove")).toBeInTheDocument();
  });

  it("enters edit mode from the Edit button", () => {
    render(
      <DraftCommentCard comment={draft} onRemove={vi.fn()} onUpdate={vi.fn()} />,
    );

    fireEvent.click(screen.getByTestId("draft-comment-edit"));
    const input = screen.getByTestId("draft-comment-edit-input");
    expect(input).toHaveValue("Looks good");
    expect(input).toHaveFocus();
    expect(input.className).toMatch(/font-sans/);
    expect(input.className).toMatch(/\btext-base\b/);
    expect(screen.queryByTestId("draft-comment-edit")).not.toBeInTheDocument();
    expect(screen.queryByTestId("draft-comment-body")).not.toBeInTheDocument();
  });

  it("saves edits via Save button and Ctrl+Enter", () => {
    const onUpdate = vi.fn();
    const { rerender } = render(
      <DraftCommentCard comment={draft} onRemove={vi.fn()} onUpdate={onUpdate} />,
    );

    fireEvent.click(screen.getByTestId("draft-comment-edit"));
    fireEvent.change(screen.getByTestId("draft-comment-edit-input"), {
      target: { value: "  Needs a test  " },
    });
    fireEvent.click(screen.getByTestId("draft-comment-edit-save"));
    expect(onUpdate).toHaveBeenCalledWith("draft-1", "  Needs a test  ");

    onUpdate.mockClear();
    rerender(
      <DraftCommentCard
        comment={{ ...draft, body: "Needs a test" }}
        onRemove={vi.fn()}
        onUpdate={onUpdate}
      />,
    );
    fireEvent.click(screen.getByTestId("draft-comment-edit"));
    fireEvent.change(screen.getByTestId("draft-comment-edit-input"), {
      target: { value: "revised" },
    });
    fireEvent.keyDown(screen.getByTestId("draft-comment-edit-input"), {
      key: "Enter",
      ctrlKey: true,
    });
    expect(onUpdate).toHaveBeenCalledWith("draft-1", "revised");
  });

  it("does not save empty body", () => {
    const onUpdate = vi.fn();
    render(
      <DraftCommentCard comment={draft} onRemove={vi.fn()} onUpdate={onUpdate} />,
    );

    fireEvent.click(screen.getByTestId("draft-comment-edit"));
    fireEvent.change(screen.getByTestId("draft-comment-edit-input"), {
      target: { value: "   " },
    });
    expect(screen.getByTestId("draft-comment-edit-save")).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId("draft-comment-edit-input"), {
      key: "Enter",
      ctrlKey: true,
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("cancels edit with Esc or Cancel without calling onUpdate", () => {
    const onUpdate = vi.fn();
    render(
      <DraftCommentCard comment={draft} onRemove={vi.fn()} onUpdate={onUpdate} />,
    );

    fireEvent.click(screen.getByTestId("draft-comment-edit"));
    fireEvent.change(screen.getByTestId("draft-comment-edit-input"), {
      target: { value: "changed" },
    });
    fireEvent.keyDown(screen.getByTestId("draft-comment-edit-input"), {
      key: "Escape",
    });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByTestId("draft-comment-body")).toHaveTextContent("Looks good");

    fireEvent.click(screen.getByTestId("draft-comment-edit"));
    fireEvent.change(screen.getByTestId("draft-comment-edit-input"), {
      target: { value: "again" },
    });
    fireEvent.click(screen.getByTestId("draft-comment-edit-cancel"));
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByTestId("draft-comment-body")).toHaveTextContent("Looks good");
  });

  it("calls onRemove when Remove is clicked", () => {
    const onRemove = vi.fn();
    render(
      <DraftCommentCard comment={draft} onRemove={onRemove} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId("draft-comment-remove"));
    expect(onRemove).toHaveBeenCalledWith("draft-1");
  });
});
