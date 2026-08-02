import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ParsedDiff } from "@extension/lib/types";
import { DiffSearch } from "./DiffSearch";

function sampleDiff(): ParsedDiff {
  return {
    files: [
      {
        path: "src/auth/login.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/auth/login.ts#0",
            header: "@@ -1,3 +1,4 @@",
            oldStart: 1,
            oldLines: 3,
            newStart: 1,
            newLines: 4,
            lines: [
              {
                type: "context",
                content: "import { User } from './types';",
                oldLine: 1,
                newLine: 1,
              },
              { type: "context", content: "", oldLine: 2, newLine: 2 },
              { type: "add", content: "export function authenticate() {}", newLine: 3 },
              { type: "context", content: "export function logout() {}", oldLine: 3, newLine: 4 },
            ],
          },
        ],
      },
      {
        path: "src/utils/format.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/utils/format.ts#0",
            header: "@@ -1 +1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [{ type: "add", content: "return loginName;", newLine: 1 }],
          },
        ],
      },
    ],
  };
}

describe("DiffSearch", () => {
  const onClose = vi.fn();
  const onSelect = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    onSelect.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders nothing when closed", () => {
    render(<DiffSearch open={false} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    expect(screen.queryByTestId("diff-search")).not.toBeInTheDocument();
  });

  it("shows the input when open and focuses it", async () => {
    render(<DiffSearch open={true} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    const input = screen.getByTestId("diff-search-input");
    expect(input).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("renders a backdrop that dismisses search on mousedown", () => {
    render(<DiffSearch open={true} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    const backdrop = screen.getByTestId("diff-search-backdrop");
    expect(backdrop).toBeInTheDocument();
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss when interacting with the panel", async () => {
    const user = userEvent.setup();
    render(<DiffSearch open={true} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    await user.click(screen.getByTestId("diff-search-input"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("filters results as the user types", async () => {
    const user = userEvent.setup();
    render(<DiffSearch open={true} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    const input = screen.getByTestId("diff-search-input");
    await user.type(input, "authenticate");

    expect(screen.getByTestId("diff-search-results")).toBeInTheDocument();
    // Text may be split across highlight <mark> nodes.
    expect(screen.getByTestId("diff-search-preview-match-line")).toHaveTextContent(
      /export function authenticate/,
    );
    expect(screen.getByTestId("diff-search-meta")).toHaveTextContent(/match/);
  });

  it("shows surrounding context lines and brand-highlights the match", () => {
    render(<DiffSearch open={true} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    // Set the full query at once so highlight ranges use the complete token
    // (character-by-character typing would leave intermediate Fuse fuzzy marks).
    fireEvent.change(screen.getByTestId("diff-search-input"), {
      target: { value: "authenticate" },
    });

    const preview = screen.getByTestId("diff-search-line-preview");
    expect(preview).toBeInTheDocument();
    // Context above / below the hit
    expect(preview).toHaveTextContent("import { User }");
    expect(preview).toHaveTextContent("export function logout");
    expect(screen.getByTestId("diff-search-preview-match-line")).toHaveTextContent(
      "export function authenticate",
    );
    // Matched token painted with brand mark
    const marks = screen.getAllByTestId("diff-search-match-mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.map((m) => m.textContent).join("")).toMatch(/authenticate/i);
  });

  it("calls onSelect with the active result on Enter", async () => {
    const user = userEvent.setup();
    render(<DiffSearch open={true} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    const input = screen.getByTestId("diff-search-input");
    await user.type(input, "authenticate");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({
      kind: "line",
      filePath: "src/auth/login.ts",
      content: "export function authenticate() {}",
    });
  });

  it("calls onClose on Escape", async () => {
    render(<DiffSearch open={true} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    const input = screen.getByTestId("diff-search-input");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves the active option with arrow keys", async () => {
    const user = userEvent.setup();
    render(<DiffSearch open={true} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    const input = screen.getByTestId("diff-search-input");
    // Broad query so we get both file and line hits
    await user.type(input, "login");

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("selects a result on click", async () => {
    const user = userEvent.setup();
    render(<DiffSearch open={true} diff={sampleDiff()} onClose={onClose} onSelect={onSelect} />);
    await user.type(screen.getByTestId("diff-search-input"), "authenticate");
    const option = screen.getByTestId("diff-search-result-line");
    await user.click(option);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("routes keys through keyActionRef for the overlay capture listener", () => {
    const keyActionRef = { current: null as ((e: KeyboardEvent) => boolean) | null };
    render(
      <DiffSearch
        open={true}
        diff={sampleDiff()}
        onClose={onClose}
        onSelect={onSelect}
        keyActionRef={keyActionRef}
      />,
    );
    expect(keyActionRef.current).toBeTypeOf("function");
    // Escape via capture-path handler
    expect(keyActionRef.current!(new KeyboardEvent("keydown", { key: "Escape" }))).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
