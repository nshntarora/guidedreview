import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFileLineUrl, buildPRFileDiffUrl } from "@extension/lib/github/prUrls";
import type { DiffFile, DiffHunk, PRContext } from "@extension/lib/types";
import { buildSelectableLines } from "@extension/content/overlay/buildSelectableLines";
import { DEFAULT_DIFF_VIEW_MODE } from "@extension/lib/preferences";
import { createGitHubReviewHost } from "@extension/content/githubHost";
import { setActiveReviewHost } from "../host";
import {
  resetDiffViewModeHydrationForTests,
  useReviewStore,
} from "@extension/content/overlay/store";
import type { ResolvedUnitFile } from "@extension/content/overlay/buildSelectableLines";
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
    setActiveReviewHost(createGitHubReviewHost());
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
    const expectedHref = await buildPRFileDiffUrl(
      { owner: "acme", repo: "widgets", number: 42 },
      filePath,
    );
    useReviewStore.setState({ prContext: prContextFixture() });
    const file = fileFixture({
      path: filePath,
      isBinaryOrElided: true,
      hunks: [],
    });

    renderPane([{ file, hunks: [] }]);

    // URL is built async via crypto.subtle — wait for the link to appear.
    const link = await screen.findByTestId("binary-elided-github-link");

    expect(link).toHaveAttribute("href", expectedHref);
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

  it("does not show a gap placeholder for a single-hunk file", () => {
    renderPane();
    expect(screen.queryByTestId("hunk-gap-placeholder")).not.toBeInTheDocument();
  });

  it("shows a clickable gap ellipsis between non-adjacent hunks", async () => {
    const first = hunkFixture({
      id: "src/foo.ts#0",
      header: "@@ -1,2 +1,2 @@",
      oldStart: 1,
      oldLines: 2,
      newStart: 1,
      newLines: 2,
      lines: [
        { type: "context", content: "a", oldLine: 1, newLine: 1 },
        { type: "add", content: "b", newLine: 2 },
      ],
    });
    const second = hunkFixture({
      id: "src/foo.ts#1",
      header: "@@ -20,2 +20,2 @@",
      oldStart: 20,
      oldLines: 2,
      newStart: 20,
      newLines: 2,
      lines: [
        { type: "context", content: "c", oldLine: 20, newLine: 20 },
        { type: "add", content: "d", newLine: 21 },
      ],
    });
    const file = fileFixture({ hunks: [first, second] });
    useReviewStore.setState({ prContext: prContextFixture() });

    const expectedHref = await buildFileLineUrl(
      { owner: "acme", repo: "widgets", number: 42 },
      { filePath: "src/foo.ts", line: 2, headRef: "feature" },
    );

    renderPane([{ file, hunks: [first, second] }]);

    // URL is built async via buildFileLineUrl — wait until the div becomes a link.
    const gap = await screen.findByRole("link", { name: /View Collapsed Lines/i });
    expect(gap).toHaveAttribute("data-testid", "hunk-gap-placeholder");
    expect(gap).toHaveAttribute("href", expectedHref);
    expect(gap).toHaveAttribute("target", "_blank");
    expect(gap).toHaveTextContent("View Collapsed Lines");
  });
});
