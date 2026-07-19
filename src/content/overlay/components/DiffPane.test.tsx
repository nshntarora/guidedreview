import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { sha256Hex } from "../../../lib/github/prFileDiffUrl";
import type { DiffFile, DiffHunk, PRContext } from "../../../lib/types";
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
    expect(screen.getByRole("button", { name: "Split" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
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

  it("switches to unified view when Unified is pressed", async () => {
    renderPane();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unified" }));
    });

    expect(screen.getByRole("button", { name: "Unified" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
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
    expect(
      screen.getByText("(binary or elided — no textual diff available)"),
    ).toBeInTheDocument();
    // No PR context → no GitHub link.
    expect(
      screen.queryByTestId("binary-elided-github-link"),
    ).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unified" }));
    });

    expect(
      screen.getByText("(binary or elided — no textual diff available)"),
    ).toBeInTheDocument();
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

    // Wrap render + crypto.subtle resolve so setState is inside act.
    await act(async () => {
      renderPane([{ file, hunks: [] }]);
      await new Promise((r) => setTimeout(r, 0));
    });

    const link = screen.getByTestId("binary-elided-github-link");

    expect(link).toHaveAttribute(
      "href",
      `https://github.com/acme/widgets/pull/42/files#diff-${expectedHex}`,
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("View file diff on GitHub");
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
    const line = unified.firstElementChild;
    expect(line?.className).toMatch(/whitespace-pre-wrap/);
    expect(line?.className).toMatch(/break-all/);
    expect(line?.textContent).toContain(longPath);

    await act(async () => {
      await Promise.resolve();
    });
  });
});
