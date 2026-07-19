import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { DiffFile, DiffHunk } from "../../../lib/types";
import { DEFAULT_DIFF_VIEW_MODE } from "../diffViewMode";
import { resetDiffViewModeHydrationForTests, useReviewStore } from "../store";
import type { ResolvedUnitFile } from "../selectors";
import { DiffPane } from "./DiffPane";

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
  });
}

describe("DiffPane", () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
    resetStore();
  });

  function renderPane(files = resolvedFiles(), unitTitle = "Update foo") {
    return render(<DiffPane files={files} unitTitle={unitTitle} />);
  }

  it("renders the unit title on the left and the toggle on the right", async () => {
    renderPane(resolvedFiles(), "Wire up the new auth path");

    expect(screen.getByTestId("diff-unit-title")).toHaveTextContent(
      "Wire up the new auth path",
    );
    expect(screen.getByTestId("diff-view-toggle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unified" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Split" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("diff-view-unified")).toBeInTheDocument();
    expect(screen.queryByTestId("diff-view-split")).not.toBeInTheDocument();
    // Syntax highlighting splits tokens across child spans.
    expect(
      screen.getByText((_, el) => el?.textContent === "const a = 1;"),
    ).toBeInTheDocument();
    // Let hydrateDiffViewMode settle so it does not leak into later tests.
    await act(async () => {
      await Promise.resolve();
    });
  });

  it("switches to split view when Split is pressed", async () => {
    renderPane();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Split" }));
    });

    expect(screen.getByRole("button", { name: "Split" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("diff-view-split")).toBeInTheDocument();
    expect(screen.queryByTestId("diff-view-unified")).not.toBeInTheDocument();
    expect(useReviewStore.getState().diffViewMode).toBe("split");
  });

  it("switches back to unified view", async () => {
    useReviewStore.setState({ diffViewMode: "split" });
    renderPane();

    expect(screen.getByTestId("diff-view-split")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unified" }));
    });

    expect(screen.getByTestId("diff-view-unified")).toBeInTheDocument();
    expect(useReviewStore.getState().diffViewMode).toBe("unified");
  });

  it("still shows binary/elided placeholder regardless of view mode", async () => {
    const file = fileFixture({ isBinaryOrElided: true, hunks: [] });
    renderPane([{ file, hunks: [] }]);

    expect(
      screen.getByText("(binary or elided — no textual diff available)"),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Split" }));
    });

    expect(
      screen.getByText("(binary or elided — no textual diff available)"),
    ).toBeInTheDocument();
  });

  it("persists the view mode to chrome.storage.local", async () => {
    renderPane();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Split" }));
    });

    await waitFor(async () => {
      const stored = await chrome.storage.local.get("guidedReview.diffViewMode");
      expect(stored["guidedReview.diffViewMode"]).toBe("split");
    });
  });
});
