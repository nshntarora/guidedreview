import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommentComposer } from "./CommentComposer";

describe("CommentComposer", () => {
  it("renders the line range label and autofocuses the textarea", () => {
    render(
      <CommentComposer
        filePath="src/foo.ts"
        startLine={12}
        endLine={15}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByTestId("comment-composer")).toHaveTextContent("src/foo.ts:L12–L15");
    const input = screen.getByTestId("comment-composer-input");
    expect(input).toHaveFocus();
    expect(input.className).toMatch(/font-sans/);
    expect(input.className).toMatch(/\btext-base\b/);
  });

  it("saves with Ctrl+Enter when body is non-empty", () => {
    const onSave = vi.fn();
    render(
      <CommentComposer
        filePath="a.ts"
        startLine={1}
        endLine={1}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const input = screen.getByTestId("comment-composer-input");
    fireEvent.change(input, { target: { value: "needs tests" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    expect(onSave).toHaveBeenCalledWith("needs tests");
  });

  it("does not save empty body on Ctrl+Enter", () => {
    const onSave = vi.fn();
    render(
      <CommentComposer
        filePath="a.ts"
        startLine={1}
        endLine={1}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByTestId("comment-composer-input"), {
      key: "Enter",
      ctrlKey: true,
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels on Escape", () => {
    const onCancel = vi.fn();
    render(
      <CommentComposer
        filePath="a.ts"
        startLine={1}
        endLine={1}
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(screen.getByTestId("comment-composer-input"), {
      key: "Escape",
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it("Enter alone does not save (allows newlines)", () => {
    const onSave = vi.fn();
    render(
      <CommentComposer
        filePath="a.ts"
        startLine={1}
        endLine={1}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const input = screen.getByTestId("comment-composer-input");
    fireEvent.change(input, { target: { value: "line" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
  });
});
