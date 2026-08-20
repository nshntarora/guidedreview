import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Overlay } from "./Overlay";
import { resetConfirmationQueueForTests } from "@guided-review/ui";
import { DEFAULT_DIFF_VIEW_MODE } from "./diffView";
import { useReviewStore } from "./store";
import { VIEW_CHORD_WINDOW_MS } from "./useOverlayKeyboard";
import { buildFileReviewPlan } from "@guided-review/core";
import type { ParsedDiff, PRContext, ReviewPlan } from "@extension/lib/types";
import * as messaging from "@extension/lib/messaging";
import * as oauthConfig from "@extension/lib/github/oauthConfig";
import { createGitHubReviewHost } from "@extension/content/githubHost";
import { createMemoryReviewHost, setActiveReviewHost } from "./host";
import type { LocalDiffControls } from "./localReview";

const sampleAuth = {
  accessToken: "gho_test",
  tokenType: "bearer",
  scope: "repo,read:user",
  login: "octocat",
};

vi.mock("../../lib/messaging", () => ({
  requestSubmitReview: vi.fn(),
  getGitHubAuthStatus: vi.fn(),
  startGitHubDeviceAuth: vi.fn(),
  pollGitHubDeviceAuth: vi.fn(),
  openOptionsPage: vi.fn(),
}));

// CI has no .env with VITE_GITHUB_CLIENT_ID; mock configured so the connect
// prompt/button render (same pattern as ConnectGitHubModal.test.tsx).
vi.mock("../../lib/github/oauthConfig", () => ({
  isGitHubOAuthConfigured: vi.fn(() => true),
}));

function diffFixture(): ParsedDiff {
  return {
    files: [
      {
        path: "src/foo.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/foo.ts#0",
            header: "@@ -1,1 +1,1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [{ type: "context", content: "const x = 1;", oldLine: 1, newLine: 1 }],
          },
        ],
      },
    ],
  };
}

function planFixture(): ReviewPlan {
  return {
    units: [
      {
        id: "u1",
        title: "Update foo",
        kind: "change",
        context: "because it needed updating",
        files: [{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" }],
      },
    ],
  };
}

function prContextFixture(overrides: Partial<PRContext> = {}): PRContext {
  return {
    owner: "acme",
    repo: "widgets",
    number: 1,
    url: "https://github.com/acme/widgets/pull/1",
    title: "Add feature",
    description: "This PR adds a feature.",
    descriptionHtml: "<p>This PR adds a feature.</p>",
    author: "octocat",
    baseRef: "main",
    headRef: "feature",
    ...overrides,
  };
}

function resetStore(): void {
  useReviewStore.setState({
    isOpen: false,
    status: "idle",
    error: null,
    needsProvider: false,
    buildPhase: null,
    providerLabel: null,
    diff: null,
    plan: null,
    prContext: null,
    currentUnitIndex: 0,
    streamGeneration: 0,
    sessionKey: null,
    diffViewMode: DEFAULT_DIFF_VIEW_MODE,
    planSource: null,
    uiMode: "navigate",
    selectableLines: [],
    lineSelection: null,
    composerOpen: false,
    draftComments: [],
  });
}

function seedReadyReview(unitIndex = 1): void {
  useReviewStore.setState({
    isOpen: true,
    status: "ready",
    diff: diffFixture(),
    plan: planFixture(),
    prContext: prContextFixture(),
    currentUnitIndex: unitIndex,
  });
}

function localDiffFixture(overrides: Partial<LocalDiffControls> = {}): LocalDiffControls {
  return {
    scopes: [
      {
        id: "branch",
        label: "feat vs main",
        description: "Committed work on this branch.",
        meta: "1 commit · 1 file · +1 −0",
        stat: { files: 1, additions: 1, deletions: 0 },
        empty: false,
      },
      {
        id: "uncommitted",
        label: "Uncommitted changes",
        description: "Staged and unstaged work versus HEAD.",
        meta: "1 file · +2 −0",
        stat: { files: 1, additions: 2, deletions: 0 },
        empty: false,
      },
      {
        id: "commit:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        label: "Add header",
        description: "Ada · 2026-01-02",
        meta: "aaaaaaa · 1 file · +1 −0",
        stat: { files: 1, additions: 1, deletions: 0 },
        empty: false,
      },
    ],
    selectedScope: "branch",
    commits: [
      {
        sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        shortSha: "aaaaaaa",
        subject: "Add header",
        body: "",
        author: "Ada",
        authoredAt: "2026-01-02T00:00:00Z",
        stat: { files: 1, additions: 1, deletions: 0 },
      },
    ],
    onSelectScope: vi.fn(),
    onStructureReview: vi.fn(),
    structuring: false,
    structured: false,
    ...overrides,
  };
}

function renderLocalOverlay(overrides: Partial<LocalDiffControls> = {}): LocalDiffControls {
  setActiveReviewHost(
    createMemoryReviewHost({
      kind: "local",
      exportNotes: vi.fn(),
      submit: undefined,
    }),
  );
  seedReadyReview(0);
  useReviewStore.setState({
    prContext: prContextFixture({
      source: "local",
      title: "feat",
      description: "raw log",
      descriptionHtml: "",
      author: undefined,
      number: undefined,
    }),
  });
  const localDiff = localDiffFixture(overrides);
  render(<Overlay allowExit={false} localDiff={localDiff} />);
  return localDiff;
}

describe("Overlay", () => {
  beforeEach(() => {
    setActiveReviewHost(createGitHubReviewHost());
    resetStore();
    resetConfirmationQueueForTests();
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn();
    // jsdom does not implement scrollBy; ArrowDown scrolls the code column.
    Element.prototype.scrollBy = vi.fn();
    vi.mocked(oauthConfig.isGitHubOAuthConfigured).mockReturnValue(true);
    vi.mocked(messaging.requestSubmitReview).mockReset();
    vi.mocked(messaging.requestSubmitReview).mockResolvedValue({
      ok: true,
      reviewId: 1,
      htmlUrl: "https://github.com/acme/widgets/pull/1#pullrequestreview-1",
    });
    vi.mocked(messaging.getGitHubAuthStatus).mockReset();
    vi.mocked(messaging.getGitHubAuthStatus).mockResolvedValue({
      ok: true,
      auth: sampleAuth,
    });
  });

  afterEach(() => {
    resetConfirmationQueueForTests();
  });

  it("renders nothing when the review isn't open", () => {
    const { container } = render(<Overlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it("uses Generate Prompt and Change summary for a local host", () => {
    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
      }),
    );
    seedReadyReview(0);
    render(<Overlay allowExit={false} />);

    expect(screen.getByTestId("submit-review-button")).toHaveTextContent("Generate Prompt");
    expect(screen.getByTestId("submit-review-button")).toBeDisabled();
    expect(screen.getAllByText("Change summary").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("#1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^exit$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
  });

  it("opens Generate Prompt with draft notes for a local host", async () => {
    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
      }),
    );
    seedReadyReview(0);
    useReviewStore.setState({
      draftComments: [
        {
          id: "d1",
          filePath: "src/foo.ts",
          side: "RIGHT",
          startLine: 1,
          endLine: 1,
          lineIds: ["src/foo.ts#0:0:RIGHT"],
          selectedCode: "const x = 1;",
          body: "Prefer a named constant",
        },
      ],
    });
    render(<Overlay allowExit={false} />);

    const button = screen.getByTestId("submit-review-button");
    expect(button).toBeEnabled();
    fireEvent.click(button);

    expect(await screen.findByTestId("generate-prompt-modal")).toBeInTheDocument();
    const prompt = screen.getByTestId("generate-prompt-text");
    expect(prompt).toHaveTextContent("Review feedback to apply");
    expect(prompt).toHaveTextContent("src/foo.ts");
    expect(prompt).toHaveTextContent("const x = 1;");
    expect(prompt).toHaveTextContent("Prefer a named constant");
    expect(screen.getByTestId("generate-prompt-copy")).toBeInTheDocument();
  });

  it("closes Generate Prompt on Esc without exiting a local review", async () => {
    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
      }),
    );
    seedReadyReview(0);
    useReviewStore.setState({
      draftComments: [
        {
          id: "d1",
          filePath: "src/foo.ts",
          side: "RIGHT",
          startLine: 1,
          endLine: 1,
          lineIds: ["src/foo.ts#0:0:RIGHT"],
          selectedCode: "const x = 1;",
          body: "Prefer a named constant",
        },
      ],
    });
    render(<Overlay allowExit={false} />);

    fireEvent.click(screen.getByTestId("submit-review-button"));
    expect(await screen.findByTestId("generate-prompt-modal")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("generate-prompt-modal")).not.toBeInTheDocument();
    expect(useReviewStore.getState().isOpen).toBe(true);
    expect(screen.getByTestId("submit-review-button")).toBeInTheDocument();
  });

  it("copies the prompt with Ctrl+Enter while Generate Prompt is open", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
      }),
    );
    seedReadyReview(0);
    useReviewStore.setState({
      draftComments: [
        {
          id: "d1",
          filePath: "src/foo.ts",
          side: "RIGHT",
          startLine: 1,
          endLine: 1,
          lineIds: ["src/foo.ts#0:0:RIGHT"],
          selectedCode: "const x = 1;",
          body: "Prefer a named constant",
        },
      ],
    });
    render(<Overlay allowExit={false} />);

    fireEvent.click(screen.getByTestId("submit-review-button"));
    expect(await screen.findByTestId("generate-prompt-modal")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(writeText.mock.calls[0]?.[0]).toContain("Prefer a named constant");
    expect(writeText.mock.calls[0]?.[0]).toContain("src/foo.ts");
    expect(screen.getByTestId("generate-prompt-modal")).toBeInTheDocument();
  });

  it("opens settings from the local header and hides the control on GitHub", () => {
    const connectProvider = vi.fn();
    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
        connectProvider,
      }),
    );
    seedReadyReview(0);
    const { unmount } = render(<Overlay allowExit={false} />);
    const settings = screen.getByTestId("open-settings");
    expect(settings).toHaveAttribute("aria-keyshortcuts", "Meta+, Control+,");
    fireEvent.click(settings);
    expect(connectProvider).toHaveBeenCalledTimes(1);
    unmount();

    setActiveReviewHost(createGitHubReviewHost());
    seedReadyReview(0);
    render(<Overlay />);
    expect(screen.queryByTestId("open-settings")).not.toBeInTheDocument();
  });

  it("does not exit a local review on Escape, but still leaves comment mode", () => {
    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
      }),
    );
    seedReadyReview(1);
    render(<Overlay allowExit={false} />);

    fireEvent.keyDown(window, { key: "c" });
    expect(useReviewStore.getState().uiMode).toBe("comment");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(useReviewStore.getState().uiMode).toBe("navigate");
    expect(useReviewStore.getState().isOpen).toBe(true);
    expect(screen.queryByText("Exit review?")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Exit review?")).not.toBeInTheDocument();
    expect(useReviewStore.getState().isOpen).toBe(true);
  });

  it("ignores overlay shortcuts while inert under the local settings modal", () => {
    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
      }),
    );
    seedReadyReview(1);
    render(<Overlay allowExit={false} inert />);

    expect(screen.getByTestId("guided-review-overlay")).toHaveAttribute("inert");
    fireEvent.keyDown(window, { key: "c" });
    expect(useReviewStore.getState().uiMode).toBe("navigate");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useReviewStore.getState().uiMode).toBe("navigate");
  });

  it("shows the local scope picker, commit cards, and structure trigger", () => {
    renderLocalOverlay();

    const picker = screen.getByRole("combobox", { name: /diff to review/i });
    expect(picker).toBeInTheDocument();
    expect(picker).toHaveTextContent("feat vs main");
    expect(picker.querySelector("[data-slot=kbd]")).toHaveTextContent("d");
    expect(picker).not.toHaveTextContent("1 commit · 1 file");
    expect(screen.queryByText(/main\s*←\s*feat/)).not.toBeInTheDocument();
    expect(screen.queryByText(/main\s*←\s*feature/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "feat" })).toHaveClass("gr-sr-only");
    expect(screen.getByTestId("uncommitted-card")).toHaveTextContent("Uncommitted changes");
    expect(screen.getByTestId("commit-card")).toHaveTextContent("Add header");
    expect(screen.getByTestId("structure-review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^exit$/i })).not.toBeInTheDocument();

    fireEvent.click(picker);
    expect(screen.getByText("Last 5 commits")).toBeInTheDocument();
    const commitOption = screen.getByRole("option", { name: /add header/i });
    expect(commitOption).toBeInTheDocument();
    expect(commitOption.querySelector(".text-diff-add")).toHaveTextContent("+1");
    expect(commitOption.querySelector(".text-diff-del")).toHaveTextContent("−0");
  });

  it("shows a stale-diff banner and calls onRefresh", () => {
    const onRefresh = vi.fn();
    renderLocalOverlay({ stale: true, onRefresh });

    expect(screen.getByTestId("stale-diff-banner")).toHaveTextContent(
      "The diff on disk has changed.",
    );
    fireEvent.click(screen.getByRole("button", { name: /^refresh$/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  describe("local review keyboard", () => {
    it("opens the scope picker on d and structures on ⌘/Ctrl+I", () => {
      const { onStructureReview } = renderLocalOverlay();

      const picker = screen.getByRole("combobox", { name: /diff to review/i });
      expect(picker).toHaveAttribute("aria-expanded", "false");

      fireEvent.keyDown(window, { key: "i", metaKey: true });
      expect(onStructureReview).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(window, { key: "i", ctrlKey: true });
      expect(onStructureReview).toHaveBeenCalledTimes(2);

      fireEvent.keyDown(window, { key: "d" });
      expect(picker).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("opens settings on ⌘/Ctrl+,", () => {
      const connectProvider = vi.fn();
      setActiveReviewHost(
        createMemoryReviewHost({
          kind: "local",
          exportNotes: vi.fn(),
          submit: undefined,
          connectProvider,
        }),
      );
      seedReadyReview(0);
      render(<Overlay allowExit={false} localDiff={localDiffFixture()} />);

      fireEvent.keyDown(window, { key: ",", metaKey: true });
      expect(connectProvider).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(window, { key: ",", ctrlKey: true });
      expect(connectProvider).toHaveBeenCalledTimes(2);
    });

    it("does not structure after the review is already structured", () => {
      const { onStructureReview } = renderLocalOverlay({ structured: true });

      expect(screen.queryByTestId("structure-review")).not.toBeInTheDocument();
      fireEvent.keyDown(window, { key: "i", metaKey: true });
      expect(onStructureReview).not.toHaveBeenCalled();
    });

    it("does not bind local shortcuts on a GitHub review", () => {
      const connectProvider = vi.fn();
      setActiveReviewHost(createMemoryReviewHost({ connectProvider }));
      seedReadyReview(0);
      render(<Overlay />);

      expect(screen.queryByRole("combobox", { name: /diff to review/i })).not.toBeInTheDocument();
      fireEvent.keyDown(window, { key: "d" });
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      fireEvent.keyDown(window, { key: "i", metaKey: true });
      fireEvent.keyDown(window, { key: ",", metaKey: true });
      expect(connectProvider).not.toHaveBeenCalled();
      expect(useReviewStore.getState().isOpen).toBe(true);
    });
  });

  it("shows the full layout with the PR description unit while loading", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "loading",
      buildPhase: "extracting_diff",
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    // Title in left pane + entry in the unit list.
    expect(screen.getAllByText("PR Description").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("This PR adds a feature.")).toBeInTheDocument();
    const loading = screen.getByTestId("context-panel-loading");
    expect(loading).toHaveTextContent(/building a review plan/i);
    expect(screen.getByTestId("context-panel-loading-detail")).toHaveTextContent(
      /extracting the diff/i,
    );
    expect(screen.getByRole("status", { name: /building a review plan/i })).toBeInTheDocument();
    // Skeleton placeholders are present (non-interactive bars in the unit list).
    expect(screen.getAllByTestId("unit-skeleton").length).toBeGreaterThan(0);
    // Shortcuts are reserved for the ready state; spinner occupies that slot while loading.
    expect(screen.queryByLabelText(/keyboard shortcuts/i)).not.toBeInTheDocument();
    // No full-page loading spinner copy.
    expect(screen.queryByText(/reading the diff/i)).not.toBeInTheDocument();
    // Diff has not arrived yet — no Changes summary.
    expect(screen.queryByLabelText(/diff summary/i)).not.toBeInTheDocument();
  });

  it("shows the diff summary while the plan is still loading once the diff is fetched", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "loading",
      buildPhase: "processing_diff",
      diff: diffFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    expect(screen.getByLabelText(/diff summary/i)).toBeInTheDocument();
    expect(screen.getByText("src/foo.ts")).toBeInTheDocument();
    // Plan still loading — skeleton + status copy remain.
    expect(screen.getByTestId("context-panel-loading")).toHaveTextContent(
      /building a review plan/i,
    );
    expect(screen.getByTestId("context-panel-loading-detail")).toHaveTextContent(
      /processing the diff/i,
    );
    expect(screen.getAllByTestId("unit-skeleton").length).toBeGreaterThan(0);
  });

  it("shows completed units alongside skeletons while streaming", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "streaming",
      buildPhase: "tokens_streaming",
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    expect(screen.getByText("Update foo")).toBeInTheDocument();
    expect(screen.getAllByTestId("unit-skeleton").length).toBeGreaterThan(0);
    expect(screen.getByTestId("context-panel-loading")).toHaveTextContent(
      /building a review plan/i,
    );
    expect(screen.getByTestId("context-panel-loading-detail")).toHaveTextContent(
      /tokens are streaming/i,
    );
  });

  it("names the configured provider in the loading detail when the request is sent", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "streaming",
      buildPhase: "sent_to_provider",
      providerLabel: "Claude (Anthropic)",
      diff: diffFixture(),
      plan: { units: [] },
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    expect(screen.getByTestId("context-panel-loading-detail")).toHaveTextContent(
      /sent it to claude \(anthropic\)/i,
    );
  });

  it("shows unit context without the building spinner when viewing a streamed unit", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "streaming",
      buildPhase: "tokens_streaming",
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 1,
    });
    render(<Overlay />);

    expect(screen.getByText("because it needed updating")).toBeInTheDocument();
    expect(screen.queryByTestId("context-panel-loading")).not.toBeInTheDocument();
  });

  it("shows keyboard shortcuts on the description unit once the review plan is ready", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      buildPhase: null,
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    expect(screen.getByLabelText(/keyboard shortcuts/i)).toBeInTheDocument();
    expect(screen.getByText(/previous \/ next step/i)).toBeInTheDocument();
    expect(screen.getByText(/scroll the code pane/i)).toBeInTheDocument();
    expect(screen.getByText(/^unified view$/i)).toBeInTheDocument();
    expect(screen.getByText(/^split view$/i)).toBeInTheDocument();
    expect(screen.getByText(/^enter comment mode$/i)).toBeInTheDocument();
    expect(screen.getByText(/exit comment mode \/ exit review/i)).toBeInTheDocument();
    expect(screen.queryByTestId("context-panel-loading")).not.toBeInTheDocument();
  });

  it("shows the error in the context panel without collapsing the layout", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "error",
      error: {
        message: "Invalid API key",
        statusCode: 401,
        code: "authentication_error",
      },
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    const onRetry = vi.fn();
    render(<Overlay onRetry={onRetry} />);
    expect(screen.getByText(/^error$/i)).toBeInTheDocument();
    expect(screen.getByTestId("error-message")).toHaveTextContent("Invalid API key");
    expect(screen.getByTestId("error-status-code")).toHaveTextContent("401");
    expect(screen.getByTestId("error-code")).toHaveTextContent("authentication_error");
    expect(screen.getAllByText("PR Description").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("This PR adds a feature.")).toBeInTheDocument();

    screen.getByRole("button", { name: /^retry$/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("walks the diff with file-per-unit steps and prompts to connect a provider", () => {
    const diff = diffFixture();
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      needsProvider: true,
      diff,
      plan: buildFileReviewPlan(diff),
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    const onRetry = vi.fn();
    render(<Overlay onRetry={onRetry} />);

    expect(screen.getByTestId("connect-provider-prompt")).toBeInTheDocument();
    expect(screen.queryByTestId("context-panel-error")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^retry$/i })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("unit-skeleton")).toHaveLength(0);

    // Description unit still shows the PR body and the Changes summary.
    expect(screen.getAllByText("PR Description").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("This PR adds a feature.")).toBeInTheDocument();
    expect(screen.getByLabelText(/diff summary/i)).toBeInTheDocument();

    // One navigable step per changed file, after the description.
    expect(screen.getByText(/2 of 2|1 of 2/i)).toBeInTheDocument();
    const live = screen.getByTestId("overlay-status-live");
    expect(live).toHaveTextContent(/one per changed file/i);
    expect(live).not.toHaveTextContent(/^Error:/);
  });

  it("shows the file diff on a locally built unit, with the prompt still in the context panel", () => {
    const diff = diffFixture();
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      needsProvider: true,
      diff,
      plan: buildFileReviewPlan(diff),
      prContext: prContextFixture(),
      currentUnitIndex: 1,
    });
    render(<Overlay />);

    // The unit is the file itself: its diff renders, titled by path.
    expect(screen.getByTestId("diff-unit-title")).toHaveTextContent("src/foo.ts");
    expect(screen.getByTestId("connect-provider-prompt")).toBeInTheDocument();
  });

  it("keeps restored AI context visible even when the provider key is gone", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      needsProvider: true,
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 1,
    });
    render(<Overlay />);

    expect(screen.getByText("because it needed updating")).toBeInTheDocument();
    expect(screen.queryByTestId("connect-provider-prompt")).not.toBeInTheDocument();
  });

  it("still shows the PR description unit when the plan has no code units", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      diff: diffFixture(),
      plan: { units: [] },
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);
    expect(screen.getAllByText("PR Description").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/no review units were generated/i)).not.toBeInTheDocument();
  });

  it("renders the description unit first and the current review unit when ready", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 1,
    });
    render(<Overlay />);
    expect(screen.getAllByText("PR Description").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("diff-unit-title")).toHaveTextContent("Update foo");
    expect(screen.getByText("because it needed updating")).toBeInTheDocument();
  });

  it("does not show the PR description in the header", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);
    // Description lives in the left pane, not a header <details>.
    expect(screen.queryByRole("heading", { name: /pr description/i })).toBeInTheDocument();
    expect(screen.getByTestId("description-pane")).toBeInTheDocument();
  });

  it("shows the author's-intent hint when the PR has a description", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);
    expect(screen.getByText(/author's summary of intent/i)).toBeInTheDocument();
  });

  it("explains missing description and that intent will be inferred", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture({ description: "", descriptionHtml: "" }),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    // Left pane empty state + right pane context both mention the gap.
    expect(screen.getByTestId("description-pane-empty").textContent).toMatch(/No PR description/i);
    expect(screen.getByTestId("context-panel-body").textContent).toMatch(
      /Intent will be inferred from the title and diff/i,
    );
    expect(screen.queryByText(/author's summary of intent/i)).not.toBeInTheDocument();
  });

  it("explains missing title and description together", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "loading",
      prContext: prContextFixture({ title: "", description: "", descriptionHtml: "" }),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    expect(screen.getByTestId("description-pane-empty").textContent).toMatch(
      /No PR title or description/i,
    );
    expect(screen.getByTestId("context-panel-body").textContent).toMatch(
      /No PR title or description/i,
    );
    expect(screen.getByTestId("context-panel-body").textContent).toMatch(
      /Intent will be inferred from the diff/i,
    );
  });

  it("resets code and context pane scroll and keeps the active sidebar unit in view on keyboard nav", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    expect(screen.getByTestId("code-col")).toBeInTheDocument();
    expect(screen.getByTestId("context-pane")).toBeInTheDocument();

    const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
    const scrollIntoViewMock = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    scrollToMock.mockClear();
    scrollIntoViewMock.mockClear();

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(useReviewStore.getState().currentUnitIndex).toBe(1);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0 });
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    expect(screen.getByRole("button", { current: true }).textContent).toMatch(/Update foo/);
  });

  describe("comment mode keyboard", () => {
    it("c enters comment mode on a review unit with code", () => {
      seedReadyReview(1);
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "c" });

      expect(useReviewStore.getState().uiMode).toBe("comment");
      expect(useReviewStore.getState().lineSelection).toEqual({
        anchorIndex: 0,
        focusIndex: 0,
      });
      expect(screen.getByTestId("comment-mode-chip")).toBeInTheDocument();
      expect(screen.getByTestId("diff-line-focus")).toBeInTheDocument();
    });

    it("c is a no-op on the description unit", () => {
      seedReadyReview(0);
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "c" });

      expect(useReviewStore.getState().uiMode).toBe("navigate");
    });

    it("ArrowUp/Down move the line cursor instead of scrolling in comment mode", () => {
      seedReadyReview(1);
      // Multi-line hunk so cursor can move.
      useReviewStore.setState({
        diff: {
          files: [
            {
              path: "src/foo.ts",
              status: "modified",
              isBinaryOrElided: false,
              hunks: [
                {
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
                },
              ],
            },
          ],
        },
      });
      render(<Overlay />);
      fireEvent.keyDown(window, { key: "c" });

      const scrollBy = vi.fn();
      const codeCol = screen.getByTestId("code-col");
      codeCol.scrollBy = scrollBy;

      fireEvent.keyDown(window, { key: "ArrowDown" });
      expect(useReviewStore.getState().lineSelection?.focusIndex).toBe(1);
      expect(scrollBy).not.toHaveBeenCalled();
    });

    it("Shift+ArrowDown extends the selection", () => {
      seedReadyReview(1);
      useReviewStore.setState({
        diff: {
          files: [
            {
              path: "src/foo.ts",
              status: "modified",
              isBinaryOrElided: false,
              hunks: [
                {
                  id: "src/foo.ts#0",
                  header: "@@ -1,0 +1,3 @@",
                  oldStart: 1,
                  oldLines: 0,
                  newStart: 1,
                  newLines: 3,
                  lines: [
                    { type: "add", content: "a", newLine: 1 },
                    { type: "add", content: "b", newLine: 2 },
                    { type: "add", content: "c", newLine: 3 },
                  ],
                },
              ],
            },
          ],
        },
      });
      render(<Overlay />);
      fireEvent.keyDown(window, { key: "c" });
      fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });
      fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });

      expect(useReviewStore.getState().lineSelection).toEqual({
        anchorIndex: 0,
        focusIndex: 2,
      });
    });

    it("Enter opens the composer; Esc exits comment mode", () => {
      seedReadyReview(1);
      render(<Overlay />);
      fireEvent.keyDown(window, { key: "c" });
      fireEvent.keyDown(window, { key: "Enter" });

      expect(useReviewStore.getState().composerOpen).toBe(true);
      expect(screen.getByTestId("comment-composer")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByTestId("comment-composer-input"), {
        key: "Escape",
      });
      expect(useReviewStore.getState().composerOpen).toBe(false);
      expect(useReviewStore.getState().uiMode).toBe("comment");

      fireEvent.keyDown(window, { key: "Escape" });
      expect(useReviewStore.getState().uiMode).toBe("navigate");
    });

    it("Ctrl+Enter in the composer saves a draft comment", () => {
      seedReadyReview(1);
      render(<Overlay />);
      fireEvent.keyDown(window, { key: "c" });
      fireEvent.keyDown(window, { key: "Enter" });

      const input = screen.getByTestId("comment-composer-input");
      fireEvent.change(input, { target: { value: "Please add a test" } });
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

      expect(useReviewStore.getState().draftComments).toHaveLength(1);
      expect(useReviewStore.getState().draftComments[0].body).toBe("Please add a test");
      expect(useReviewStore.getState().composerOpen).toBe(false);
      expect(screen.getByTestId("draft-comment")).toHaveTextContent("Please add a test");
    });

    it("Ctrl+Enter via window capture saves when the composer textarea is focused", () => {
      seedReadyReview(1);
      render(<Overlay />);
      fireEvent.keyDown(window, { key: "c" });
      fireEvent.keyDown(window, { key: "Enter" });

      const input = screen.getByTestId("comment-composer-input");
      fireEvent.change(input, { target: { value: "From window handler" } });
      input.focus();
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true, bubbles: true });

      expect(useReviewStore.getState().draftComments).toHaveLength(1);
      expect(useReviewStore.getState().draftComments[0].body).toBe("From window handler");
    });
  });

  describe("submit review modal", () => {
    async function openSubmitReviewModal(): Promise<void> {
      fireEvent.click(screen.getByTestId("submit-review-button"));
      expect(await screen.findByTestId("submit-review-modal")).toBeInTheDocument();
    }

    it("opens from the header Submit Review button when authenticated", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();
      await openSubmitReviewModal();
      expect(screen.getByRole("dialog", { name: "Submit Review" })).toBeInTheDocument();
    });

    it("opens the Connect GitHub modal when unauthenticated", async () => {
      vi.mocked(messaging.getGitHubAuthStatus).mockResolvedValue({
        ok: true,
        auth: null,
      });
      seedReadyReview(0);
      render(<Overlay />);

      fireEvent.click(screen.getByTestId("submit-review-button"));
      expect(await screen.findByTestId("connect-github-modal")).toBeInTheDocument();
      expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();
      expect(screen.getByTestId("connect-github-prompt")).toHaveTextContent(
        /Connect GitHub to submit this review/i,
      );
    });

    it("opens submit review after successful connect-from-modal auth", async () => {
      vi.mocked(messaging.getGitHubAuthStatus).mockResolvedValue({
        ok: true,
        auth: null,
      });
      vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue({
        ok: true,
        userCode: "ABCD-EFGH",
        verificationUri: "https://github.com/login/device",
        deviceCode: "device-auth",
        interval: 0,
        expiresIn: 900,
      });
      vi.mocked(messaging.pollGitHubDeviceAuth).mockResolvedValue({
        ok: true,
        status: "authorized",
        auth: sampleAuth,
      });

      seedReadyReview(0);
      render(<Overlay />);

      fireEvent.click(screen.getByTestId("submit-review-button"));
      expect(await screen.findByTestId("connect-github-modal")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("connect-github-connect"));

      await waitFor(() => {
        expect(screen.queryByTestId("connect-github-modal")).not.toBeInTheDocument();
      });
      expect(await screen.findByTestId("submit-review-modal")).toBeInTheDocument();
    });

    it("closes the Connect GitHub modal on Esc without exiting the overlay", async () => {
      vi.mocked(messaging.getGitHubAuthStatus).mockResolvedValue({
        ok: true,
        auth: null,
      });
      seedReadyReview(0);
      render(<Overlay />);

      fireEvent.click(screen.getByTestId("submit-review-button"));
      expect(await screen.findByTestId("connect-github-modal")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("connect-github-modal")).not.toBeInTheDocument();
      expect(useReviewStore.getState().isOpen).toBe(true);
    });

    it("opens with meta+Enter when the modal is closed", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();
      fireEvent.keyDown(window, { key: "Enter", metaKey: true });
      expect(await screen.findByTestId("submit-review-modal")).toBeInTheDocument();
    });

    it("opens Connect GitHub with meta+Enter when unauthenticated", async () => {
      vi.mocked(messaging.getGitHubAuthStatus).mockResolvedValue({
        ok: true,
        auth: null,
      });
      seedReadyReview(0);
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "Enter", metaKey: true });
      expect(await screen.findByTestId("connect-github-modal")).toBeInTheDocument();
      expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();
    });

    it("opens with Ctrl+Enter when the modal is closed", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
      expect(await screen.findByTestId("submit-review-modal")).toBeInTheDocument();
    });

    it("opens with meta+Enter from comment mode (without opening the line composer)", async () => {
      seedReadyReview(1);
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "c" });
      expect(useReviewStore.getState().uiMode).toBe("comment");

      fireEvent.keyDown(window, { key: "Enter", metaKey: true });
      expect(await screen.findByTestId("submit-review-modal")).toBeInTheDocument();
      expect(useReviewStore.getState().composerOpen).toBe(false);
    });

    it("closes on Esc without exiting the overlay", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();
      expect(useReviewStore.getState().isOpen).toBe(true);
    });

    it("prompts to exit on Esc after the modal is closed, then exits on confirm", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(await screen.findByTestId("confirmation-dialog")).toBeInTheDocument();
      expect(screen.getByText("Exit review?")).toBeInTheDocument();
      expect(useReviewStore.getState().isOpen).toBe(true);

      fireEvent.click(screen.getByTestId("confirmation-ok"));
      await waitFor(() => {
        expect(useReviewStore.getState().isOpen).toBe(false);
      });
    });

    it("stays open when exit confirmation is cancelled", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "Escape" });
      expect(await screen.findByTestId("confirmation-dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("confirmation-cancel"));
      await waitFor(() => {
        expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
      });
      expect(useReviewStore.getState().isOpen).toBe(true);
    });

    it("submits a review to GitHub and shows the success modal", async () => {
      seedReadyReview(0);
      useReviewStore.setState({
        draftComments: [
          {
            id: "d1",
            filePath: "src/foo.ts",
            side: "RIGHT",
            startLine: 1,
            endLine: 1,
            lineIds: ["src/foo.ts#0:0:RIGHT"],
            selectedCode: "const x = 1;",
            body: "inline note",
          },
        ],
      });
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
      fireEvent.change(screen.getByTestId("submit-review-body"), {
        target: { value: "Looks good" },
      });
      fireEvent.click(screen.getByTestId("submit-review-confirm"));

      await waitFor(() => {
        expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();
      });
      expect(screen.getByTestId("review-submitted-modal")).toBeInTheDocument();
      expect(screen.getByTestId("review-submitted-summary")).toHaveTextContent(
        "You approved this pull request and left 1 comment.",
      );
      expect(messaging.requestSubmitReview).toHaveBeenCalledWith(
        { owner: "acme", repo: "widgets", number: 1 },
        "Looks good",
        "APPROVE",
        [
          {
            path: "src/foo.ts",
            body: "inline note",
            side: "RIGHT",
            line: 1,
          },
        ],
      );
      expect(useReviewStore.getState().draftComments).toHaveLength(0);
      expect(useReviewStore.getState().isOpen).toBe(true);
    });

    it("sends startLine/startSide only for multi-line draft comments", async () => {
      seedReadyReview(0);
      useReviewStore.setState({
        draftComments: [
          {
            id: "d1",
            filePath: "src/foo.ts",
            side: "RIGHT",
            startLine: 3,
            endLine: 7,
            lineIds: ["src/foo.ts#0:2:RIGHT"],
            selectedCode: "line three\n...\nline seven",
            body: "spans lines",
          },
        ],
      });
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
      fireEvent.change(screen.getByTestId("submit-review-body"), {
        target: { value: "Looks good" },
      });
      fireEvent.click(screen.getByTestId("submit-review-confirm"));

      // GitHub rejects startLine/startSide on single-line comments, so they are
      // only present when the range actually spans more than one line.
      await waitFor(() => {
        expect(messaging.requestSubmitReview).toHaveBeenCalledWith(
          { owner: "acme", repo: "widgets", number: 1 },
          "Looks good",
          "APPROVE",
          [
            {
              path: "src/foo.ts",
              body: "spans lines",
              side: "RIGHT",
              line: 7,
              startLine: 3,
              startSide: "RIGHT",
            },
          ],
        );
      });
    });

    it("exits the review from the success modal and navigates to conversation", async () => {
      const assign = vi.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { pathname: "/acme/widgets/pull/1/files", assign },
      });

      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
      fireEvent.change(screen.getByTestId("submit-review-body"), {
        target: { value: "Looks good" },
      });
      fireEvent.click(screen.getByTestId("submit-review-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("review-submitted-modal")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("review-submitted-exit"));

      expect(useReviewStore.getState().isOpen).toBe(false);
      expect(assign).toHaveBeenCalledWith("https://github.com/acme/widgets/pull/1");
      expect(screen.queryByTestId("review-submitted-modal")).not.toBeInTheDocument();

      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    });

    it("exits the review with Enter while the success modal is open", async () => {
      const assign = vi.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { pathname: "/acme/widgets/pull/1", assign },
      });

      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
      fireEvent.change(screen.getByTestId("submit-review-body"), {
        target: { value: "Looks good" },
      });
      fireEvent.click(screen.getByTestId("submit-review-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("review-submitted-modal")).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: "Enter" });

      expect(useReviewStore.getState().isOpen).toBe(false);
      expect(assign).not.toHaveBeenCalled();
      expect(screen.queryByTestId("review-submitted-modal")).not.toBeInTheDocument();

      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    });

    it("keeps the modal open and shows an error when submit fails", async () => {
      vi.mocked(messaging.requestSubmitReview).mockResolvedValueOnce({
        ok: false,
        code: "not_authenticated",
        error: "Connect GitHub in the extension options before submitting a review.",
      });
      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
      fireEvent.click(screen.getByTestId("submit-review-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("submit-review-error")).toHaveTextContent(/Connect GitHub/);
      });
      expect(screen.getByTestId("submit-review-modal")).toBeInTheDocument();
    });

    it("blocks empty COMMENT body without calling the API", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.click(screen.getByTestId("submit-review-event-COMMENT"));
      fireEvent.click(screen.getByTestId("submit-review-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("submit-review-error")).toHaveTextContent(/Add a review comment/);
      });
      expect(messaging.requestSubmitReview).not.toHaveBeenCalled();
    });

    it("submits with meta+Enter via the window capture handler", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
      fireEvent.change(screen.getByTestId("submit-review-body"), {
        target: { value: "Approved via shortcut" },
      });
      fireEvent.keyDown(window, { key: "Enter", metaKey: true });

      await waitFor(() => {
        expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();
      });
      expect(screen.getByTestId("review-submitted-modal")).toBeInTheDocument();
      expect(messaging.requestSubmitReview).toHaveBeenCalledWith(
        { owner: "acme", repo: "widgets", number: 1 },
        "Approved via shortcut",
        "APPROVE",
        [],
      );
      expect(useReviewStore.getState().isOpen).toBe(true);
    });

    it("submits with Ctrl+Enter via the window capture handler", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.click(screen.getByTestId("submit-review-event-COMMENT"));
      fireEvent.change(screen.getByTestId("submit-review-body"), {
        target: { value: "General feedback" },
      });
      fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });

      await waitFor(() => {
        expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();
      });
      expect(screen.getByTestId("review-submitted-modal")).toBeInTheDocument();
      expect(screen.getByTestId("review-submitted-summary")).toHaveTextContent(
        "You submitted a comment review.",
      );
      expect(messaging.requestSubmitReview).toHaveBeenCalledWith(
        { owner: "acme", repo: "widgets", number: 1 },
        "General feedback",
        "COMMENT",
        [],
      );
      expect(useReviewStore.getState().isOpen).toBe(true);
    });

    it("ArrowDown and Enter on choose step advance via window capture", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      expect(screen.getByTestId("submit-review-modal")).toHaveAttribute("data-step", "choose");

      fireEvent.keyDown(window, { key: "ArrowDown" });
      expect(screen.getByTestId("submit-review-event-APPROVE")).toHaveAttribute(
        "aria-selected",
        "true",
      );

      fireEvent.keyDown(window, { key: "Enter" });
      expect(screen.getByTestId("submit-review-modal")).toHaveAttribute("data-step", "compose");
      expect(screen.getByTestId("submit-review-selected-event")).toHaveAttribute(
        "data-event",
        "APPROVE",
      );
    });
  });

  describe("view mode keyboard chords", () => {
    it("v then u switches to unified view", () => {
      seedReadyReview(1);
      render(<Overlay />);

      expect(useReviewStore.getState().diffViewMode).toBe("split");
      expect(screen.getByTestId("diff-view-split")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "v" });
      fireEvent.keyDown(window, { key: "u" });

      expect(useReviewStore.getState().diffViewMode).toBe("unified");
      expect(screen.getByTestId("diff-view-unified")).toBeInTheDocument();
      expect(screen.queryByTestId("diff-view-split")).not.toBeInTheDocument();
    });

    it("v then s switches to split view", () => {
      seedReadyReview(1);
      useReviewStore.setState({ diffViewMode: "unified" });
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "v" });
      fireEvent.keyDown(window, { key: "s" });

      expect(useReviewStore.getState().diffViewMode).toBe("split");
      expect(screen.getByTestId("diff-view-split")).toBeInTheDocument();
    });

    it("disarms a pending v when an unrelated key lands inside the chord window", () => {
      seedReadyReview(1);
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "v" });
      // Unrelated key: consumes the leader rather than staying armed for it.
      fireEvent.keyDown(window, { key: "x" });
      fireEvent.keyDown(window, { key: "u" });

      expect(useReviewStore.getState().diffViewMode).toBe("split");
      expect(screen.getByTestId("diff-view-split")).toBeInTheDocument();
    });

    it("does not switch when the second key arrives after the chord window", () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date("2020-01-01T00:00:00.000Z"));
        seedReadyReview(1);
        render(<Overlay />);

        fireEvent.keyDown(window, { key: "v" });
        vi.setSystemTime(
          new Date(Date.parse("2020-01-01T00:00:00.000Z") + VIEW_CHORD_WINDOW_MS + 1),
        );
        fireEvent.keyDown(window, { key: "u" });

        expect(useReviewStore.getState().diffViewMode).toBe("split");
      } finally {
        vi.useRealTimers();
      }
    });

    it("works in comment mode", () => {
      seedReadyReview(1);
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "c" });
      expect(useReviewStore.getState().uiMode).toBe("comment");

      fireEvent.keyDown(window, { key: "v" });
      fireEvent.keyDown(window, { key: "u" });

      expect(useReviewStore.getState().diffViewMode).toBe("unified");
      expect(useReviewStore.getState().uiMode).toBe("comment");
    });

    it("does not change view mode while the composer is open", () => {
      seedReadyReview(1);
      render(<Overlay />);

      fireEvent.keyDown(window, { key: "c" });
      fireEvent.keyDown(window, { key: "Enter" });
      expect(useReviewStore.getState().composerOpen).toBe(true);

      fireEvent.keyDown(window, { key: "v" });
      fireEvent.keyDown(window, { key: "u" });

      expect(useReviewStore.getState().diffViewMode).toBe("split");
    });
  });

  describe("diff search (⌘/Ctrl+F)", () => {
    it("opens the search palette on meta+f and prevents browser find", () => {
      seedReadyReview(1);
      render(<Overlay />);

      const event = new KeyboardEvent("keydown", {
        key: "f",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(event, "preventDefault");
      fireEvent(window, event);

      expect(preventSpy).toHaveBeenCalled();
      expect(screen.getByTestId("diff-search")).toBeInTheDocument();
      expect(screen.getByTestId("diff-search-input")).toBeInTheDocument();
    });

    it("opens the search palette on ctrl+f", () => {
      seedReadyReview(1);
      render(<Overlay />);
      fireEvent.keyDown(window, { key: "f", ctrlKey: true });
      expect(screen.getByTestId("diff-search")).toBeInTheDocument();
    });

    it("closes search on Escape without exiting the overlay", () => {
      seedReadyReview(1);
      render(<Overlay />);
      fireEvent.keyDown(window, { key: "f", metaKey: true });
      expect(screen.getByTestId("diff-search")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("diff-search")).not.toBeInTheDocument();
      expect(useReviewStore.getState().isOpen).toBe(true);
      // Confirmation dialog for exit should not open from this Esc.
      expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
    });
  });

  describe("keyboard isolation from the host page", () => {
    function dispatchKeyOnWindow(key: string, init: KeyboardEventInit = {}) {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      const stopSpy = vi.spyOn(event, "stopPropagation");
      const preventSpy = vi.spyOn(event, "preventDefault");
      window.dispatchEvent(event);
      return { event, stopSpy, preventSpy };
    }

    it("stops propagation for unhandled keys so GitHub shortcuts cannot run", () => {
      seedReadyReview(0);
      render(<Overlay />);

      for (const key of ["s", "t", "a", "i", "?", "/"]) {
        const { stopSpy } = dispatchKeyOnWindow(key);
        expect(stopSpy).toHaveBeenCalled();
      }
      // Overlay stays open; GitHub-style keys did not trigger our exit path.
      expect(useReviewStore.getState().isOpen).toBe(true);
    });

    it("stops propagation for GitHub shortcut letters while the composer is open", () => {
      seedReadyReview(1);
      render(<Overlay />);
      fireEvent.keyDown(window, { key: "c" });
      fireEvent.keyDown(window, { key: "Enter" });
      expect(useReviewStore.getState().composerOpen).toBe(true);

      for (const key of ["s", "t", "c", "a", "i"]) {
        const { stopSpy, preventSpy } = dispatchKeyOnWindow(key);
        expect(stopSpy).toHaveBeenCalled();
        // Character keys must not be cancelled so the textarea can receive them.
        expect(preventSpy).not.toHaveBeenCalled();
      }
      expect(useReviewStore.getState().composerOpen).toBe(true);
      expect(useReviewStore.getState().isOpen).toBe(true);
    });

    it("does not preventDefault for printable keys in the composer (typing allowed)", () => {
      seedReadyReview(1);
      render(<Overlay />);
      fireEvent.keyDown(window, { key: "c" });
      fireEvent.keyDown(window, { key: "Enter" });

      const input = screen.getByTestId("comment-composer-input");
      const event = new KeyboardEvent("keydown", {
        key: "s",
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(event, "preventDefault");
      const stopSpy = vi.spyOn(event, "stopPropagation");
      input.dispatchEvent(event);

      expect(stopSpy).toHaveBeenCalled();
      expect(preventSpy).not.toHaveBeenCalled();
      expect(useReviewStore.getState().composerOpen).toBe(true);
    });
  });
});
