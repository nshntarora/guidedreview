import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sha256Hex } from "../../../lib/github/prFileDiffUrl";
import type { DiffFile, DiffHunk, PRContext } from "../../../lib/types";
import { buildSelectableLines } from "../buildSelectableLines";
import { DEFAULT_DIFF_VIEW_MODE } from "../diffViewMode";
import { resetDiffViewModeHydrationForTests, useReviewStore } from "../store";
import type { ResolvedUnitFile } from "../selectors";
import { DiffPane } from "./DiffPane";

function prContextFixture(overrides: Partial<PRContext> = {}): PRContext {
  return {
    owner: "acme",
    repo: "widgets",
    number: 42,
    url: "https://github.com/acme/widgets/pull/42",
    title: "Add logo",
    description: "",
    descriptionHtml: "",
    author: "dev",
    baseRef: "main",
    headRef: "feature",
    ...overrides,
  };
}

function hunkFixture(overrides: Partial<DiffHunk> = {}): DiffHunk {
  return {
    id: "src/foo.ts#0",
    header: "@@ -1,3 +1,4 @@",
    oldStart: 1,
    oldLines: 3,
    newStart: 1,
    newLines: 4,
    lines: [
      { type: "context", content: "const a = 1;", oldLine: 1, newLine: 1 },
      { type: "del", content: "const b = 2;", oldLine: 2 },
      { type: "add", content: "const b = 3;", newLine: 2 },
      { type: "add", content: "const c = 4;", newLine: 3 },
      { type: "context", content: "export { a, b };", oldLine: 3, newLine: 4 },
    ],
    ...overrides,
  };
}

function fileFixture(overrides: Partial<DiffFile> = {}): DiffFile {
  return {
    path: "src/foo.ts",
    status: "modified",
    isBinaryOrElided: false,
    hunks: [hunkFixture()],
    ...overrides,
  };
}

function resolvedFiles(): ResolvedUnitFile[] {
  const file = fileFixture();
  return [{ file, hunks: file.hunks }];
}

function resetStore(): void {
  resetDiffViewModeHydrationForTests();
  useReviewStore.setState({
    isOpen: false,
    status: "idle",
    error: null,
    diff: null,
    plan: null,
    prContext: null,
    currentUnitIndex: 0,
    streamGeneration: 0,
    sessionKey: null,
    diffViewMode: DEFAULT_DIFF_VIEW_MODE,
    uiMode: "navigate",
    selectableLines: [],
    lineSelection: null,
    composerOpen: false,
    draftComments: [],
  });
}

describe("DiffPane", () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
    resetStore();
  });

  function renderPane(
    files = resolvedFiles(),
    unitTitle = "Update foo",
    selectableForUnit = buildSelectableLines(files, useReviewStore.getState().diffViewMode),
  ) {
    return render(
      <DiffPane files={files} unitTitle={unitTitle} selectableForUnit={selectableForUnit} />,
    );
  }

  it("disables the add-comment button when the unit has no selectable lines", () => {
    renderPane(resolvedFiles(), "Update foo", []);

    expect(screen.getByTestId("enter-comment-mode")).toBeDisabled();
  });

  it("renders the unit title on the left and the toggle on the right", async () => {
    renderPane(resolvedFiles(), "Wire up the new auth path");

    expect(screen.getByTestId("diff-unit-title")).toHaveTextContent("Wire up the new auth path");
    expect(screen.getByTestId("diff-view-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("enter-comment-mode")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Split" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Unified" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("diff-view-split")).toBeInTheDocument();
    expect(screen.queryByTestId("diff-view-unified")).not.toBeInTheDocument();
    // Syntax highlighting splits tokens across child spans. Context lines
    // appear on both sides of split view, so the same content may match twice.
    expect(
      screen.getAllByText((_, el) => el?.textContent === "const a = 1;").length,
    ).toBeGreaterThan(0);
    // Let hydrateDiffViewMode settle so it does not leak into later tests.
    await act(async () => {
      await Promise.resolve();
    });
  });

  it("enters comment mode when Add Comment is pressed", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderPane();

    const button = screen.getByTestId("enter-comment-mode");
    expect(button).toHaveTextContent(/add comment/i);
    expect(button).not.toBeDisabled();
    expect(screen.queryByTestId("comment-mode-chip")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(useReviewStore.getState().uiMode).toBe("comment");
    expect(useReviewStore.getState().lineSelection).toEqual({
      anchorIndex: 0,
      focusIndex: 0,
    });
    expect(useReviewStore.getState().selectableLines.length).toBeGreaterThan(0);
    // Button is replaced by the comment-mode label.
    expect(screen.queryByTestId("enter-comment-mode")).not.toBeInTheDocument();
    expect(screen.getByTestId("comment-mode-chip")).toBeInTheDocument();
    expect(screen.getByTestId("comment-mode-chip")).toHaveTextContent(/comment mode/i);
  });

  it("disables Add Comment when the unit has no selectable lines", async () => {
    const file = fileFixture({
      path: "logo.png",
      isBinaryOrElided: true,
      hunks: [],
    });
    renderPane([{ file, hunks: [] }]);

    const button = screen.getByTestId("enter-comment-mode");
    expect(button).toBeDisabled();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(useReviewStore.getState().uiMode).toBe("navigate");
  });

  it("shows the comment-mode label to the left of the view toggle", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderPane();

    await act(async () => {
      fireEvent.click(screen.getByTestId("enter-comment-mode"));
    });

    const chip = screen.getByTestId("comment-mode-chip");
    const toggle = screen.getByTestId("diff-view-toggle");
    // Chip is a previous sibling of the toggle within the toolbar group.
    expect(chip.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("switches to unified view when Unified is pressed", async () => {
    renderPane();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unified" }));
    });

    expect(screen.getByRole("button", { name: "Unified" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("diff-view-unified")).toBeInTheDocument();
    expect(screen.queryByTestId("diff-view-split")).not.toBeInTheDocument();
    expect(useReviewStore.getState().diffViewMode).toBe("unified");
  });

  it("switches back to split view", async () => {
    useReviewStore.setState({ diffViewMode: "unified" });
    renderPane();

    expect(screen.getByTestId("diff-view-unified")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Split" }));
    });

    expect(screen.getByTestId("diff-view-split")).toBeInTheDocument();
    expect(useReviewStore.getState().diffViewMode).toBe("split");
  });

  it("still shows binary/elided placeholder regardless of view mode", async () => {
    const file = fileFixture({
      path: "logo.png",
      isBinaryOrElided: true,
      hunks: [],
    });
    renderPane([{ file, hunks: [] }]);

    expect(screen.getByTestId("binary-elided-empty")).toBeInTheDocument();
    expect(screen.getByText("(binary or elided — no textual diff available)")).toBeInTheDocument();
    // No PR context → no GitHub link.
    expect(screen.queryByTestId("binary-elided-github-link")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unified" }));
    });

    expect(screen.getByText("(binary or elided — no textual diff available)")).toBeInTheDocument();
  });

  it("links binary/elided files to the GitHub Files changed deep link", async () => {
    const filePath = "assets/logo.png";
    const expectedHex = await sha256Hex(filePath);
    useReviewStore.setState({ prContext: prContextFixture() });
    const file = fileFixture({
      path: filePath,
      isBinaryOrElided: true,
      hunks: [],
    });

    renderPane([{ file, hunks: [] }]);

    // URL is built async via crypto.subtle — wait for the link to appear.
    const link = await screen.findByTestId("binary-elided-github-link");

    expect(link).toHaveAttribute(
      "href",
      `https://github.com/acme/widgets/pull/42/files#diff-${expectedHex}`,
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("View File Diff on GitHub");
  });

  it("persists the view mode to chrome.storage.local", async () => {
    renderPane();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unified" }));
    });

    await waitFor(async () => {
      const stored = await chrome.storage.local.get("guidedReview.diffViewMode");
      expect(stored["guidedReview.diffViewMode"]).toBe("unified");
    });
  });

  it("soft-wraps long lines in split view so panes cannot overflow sideways", async () => {
    const longPath =
      'd="M0,0L12.34567890123456789012345678901234567890123456789012345678901234567890123456789z"';
    const file = fileFixture({
      path: "icons/logo.svg",
      hunks: [
        hunkFixture({
          id: "icons/logo.svg#0",
          lines: [
            {
              type: "del",
              content: longPath,
              oldLine: 1,
            },
            {
              type: "add",
              content: longPath.replace("L12", "L99"),
              newLine: 1,
            },
          ],
        }),
      ],
    });
    renderPane([{ file, hunks: file.hunks }]);

    const split = screen.getByTestId("diff-view-split");
    expect(split.className).toMatch(/overflow-x-hidden/);

    const left = split.querySelector('[data-side="left"]');
    const right = split.querySelector('[data-side="right"]');
    expect(left).toBeTruthy();
    expect(right).toBeTruthy();
    expect(left!.className).toMatch(/whitespace-pre-wrap/);
    expect(left!.className).toMatch(/break-all/);
    expect(left!.className).toMatch(/overflow-hidden/);
    expect(right!.className).toMatch(/whitespace-pre-wrap/);
    expect(right!.className).toMatch(/break-all/);
    expect(left!.textContent).toContain(longPath);
    expect(right!.textContent).toContain("L99");

    await act(async () => {
      await Promise.resolve();
    });
  });

  it("focus highlights the line number gutter with brand colors", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    useReviewStore.setState({ diffViewMode: "unified" });
    renderPane();

    const addId = "src/foo.ts#0:2:RIGHT";
    const delId = "src/foo.ts#0:1:LEFT";
    await act(async () => {
      useReviewStore.getState().enterCommentMode([
        {
          id: addId,
          filePath: "src/foo.ts",
          hunkId: "src/foo.ts#0",
          lineIndex: 2,
          side: "RIGHT",
          newLine: 2,
          type: "add",
        },
        {
          id: delId,
          filePath: "src/foo.ts",
          hunkId: "src/foo.ts#0",
          lineIndex: 1,
          side: "LEFT",
          oldLine: 2,
          type: "del",
        },
      ]);
    });

    const focus = screen.getByTestId("diff-line-focus");
    expect(focus).toHaveAttribute("data-line-id", addId);
    // Row wash + brand line-number gutter both mark focus.
    expect(focus.className).toMatch(/bg-gr-accent-subtle/);
    expect(focus.className).not.toMatch(/bg-gr-add-bg/);

    const focusNumbers = screen.getAllByTestId("diff-line-number-highlight");
    expect(focusNumbers.length).toBeGreaterThan(0);
    for (const num of focusNumbers) {
      expect(num.className).toMatch(/bg-gr-accent/);
      expect(num.className).toMatch(/text-gr-accent-on/);
    }

    // Unfocused del line still uses del background.
    const delLine = document.querySelector(`[data-line-id="${delId}"]`);
    expect(delLine?.className).toMatch(/bg-gr-del-bg/);
    expect(delLine?.className).not.toMatch(/bg-gr-accent-subtle/);
  });

  it("highlights line numbers for every line in a multi-line selection", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    useReviewStore.setState({ diffViewMode: "unified" });
    renderPane();

    const firstId = "src/foo.ts#0:2:RIGHT";
    const secondId = "src/foo.ts#0:3:RIGHT";
    await act(async () => {
      useReviewStore.getState().enterCommentMode([
        {
          id: firstId,
          filePath: "src/foo.ts",
          hunkId: "src/foo.ts#0",
          lineIndex: 2,
          side: "RIGHT",
          newLine: 2,
          type: "add",
        },
        {
          id: secondId,
          filePath: "src/foo.ts",
          hunkId: "src/foo.ts#0",
          lineIndex: 3,
          side: "RIGHT",
          newLine: 3,
          type: "add",
        },
      ]);
      // Extend selection to cover both lines (anchor 0, focus 1).
      useReviewStore.setState({
        lineSelection: { anchorIndex: 0, focusIndex: 1 },
      });
    });

    const firstLine = document.querySelector(`[data-line-id="${firstId}"]`);
    const secondLine = document.querySelector(`[data-line-id="${secondId}"]`);
    expect(firstLine).not.toBeNull();
    expect(secondLine).not.toBeNull();

    const firstNums = firstLine!.querySelectorAll('[data-testid="diff-line-number-highlight"]');
    const secondNums = secondLine!.querySelectorAll('[data-testid="diff-line-number-highlight"]');
    expect(firstNums.length).toBeGreaterThan(0);
    expect(secondNums.length).toBeGreaterThan(0);
    for (const num of [...firstNums, ...secondNums]) {
      expect(num.className).toMatch(/bg-gr-accent/);
      expect(num.className).toMatch(/text-gr-accent-on/);
    }
  });

  it("soft-wraps long lines in unified view", async () => {
    const longPath =
      'd="M0,0L12.34567890123456789012345678901234567890123456789012345678901234567890123456789z"';
    const file = fileFixture({
      path: "icons/logo.svg",
      hunks: [
        hunkFixture({
          id: "icons/logo.svg#0",
          lines: [{ type: "context", content: longPath, oldLine: 1, newLine: 1 }],
        }),
      ],
    });
    useReviewStore.setState({ diffViewMode: "unified" });
    renderPane([{ file, hunks: file.hunks }]);

    const unified = screen.getByTestId("diff-view-unified");
    expect(unified.className).toMatch(/overflow-x-hidden/);
    const line = unified.querySelector("[data-line-id]");
    expect(line?.className).toMatch(/whitespace-pre-wrap/);
    expect(line?.className).toMatch(/break-all/);
    expect(line?.textContent).toContain(longPath);

    await act(async () => {
      await Promise.resolve();
    });
  });

  it("renders draft comment cards with a dark surface background", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const addId = "src/foo.ts#0:2:RIGHT";
    useReviewStore.setState({
      diffViewMode: "unified",
      uiMode: "comment",
      selectableLines: [
        {
          id: addId,
          filePath: "src/foo.ts",
          hunkId: "src/foo.ts#0",
          lineIndex: 2,
          side: "RIGHT",
          newLine: 2,
          type: "add",
        },
      ],
      lineSelection: { anchorIndex: 0, focusIndex: 0 },
      draftComments: [
        {
          id: "draft-1",
          filePath: "src/foo.ts",
          side: "RIGHT",
          startLine: 2,
          endLine: 2,
          lineIds: [addId],
          body: "Looks good",
        },
      ],
    });
    renderPane();

    const card = screen.getByTestId("draft-comment");
    expect(card.className).toMatch(/bg-gr-bg/);
    expect(card.className).toMatch(/border-gr-border/);
    expect(card.className).not.toMatch(/bg-gr-accent-subtle/);
    expect(card).toHaveTextContent("Looks good");

    await act(async () => {
      await Promise.resolve();
    });
  });

  it("pins split-view comment extras to the right column only", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const addId = "src/foo.ts#0:2:RIGHT";
    useReviewStore.setState({
      diffViewMode: "split",
      uiMode: "comment",
      selectableLines: [
        {
          id: addId,
          filePath: "src/foo.ts",
          hunkId: "src/foo.ts#0",
          lineIndex: 2,
          side: "RIGHT",
          newLine: 2,
          type: "add",
        },
      ],
      lineSelection: { anchorIndex: 0, focusIndex: 0 },
      composerOpen: true,
    });
    renderPane();

    const extrasRow = screen.getByTestId("split-line-extras");
    expect(extrasRow.className).toMatch(/flex/);
    expect(screen.getByTestId("comment-composer")).toBeInTheDocument();
    // Composer lives under the right flex-1 column (third child: spacer, divider, right).
    const children = Array.from(extrasRow.children);
    expect(children).toHaveLength(3);
    const rightCol = children[2];
    expect(rightCol.className).toMatch(/flex-1/);
    expect(rightCol.querySelector('[data-testid="comment-composer"]')).not.toBeNull();
    // Left spacer has no comment UI.
    expect(children[0].querySelector('[data-testid="comment-composer"]')).toBeNull();

    await act(async () => {
      await Promise.resolve();
    });
  });
});
