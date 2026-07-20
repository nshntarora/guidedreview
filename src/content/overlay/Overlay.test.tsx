import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Overlay } from "./Overlay";
import { DEFAULT_DIFF_VIEW_MODE } from "./diffViewMode";
import { useReviewStore } from "./store";
import { PR_DESCRIPTION_UNIT_TITLE } from "./displayUnits";
import { VIEW_CHORD_WINDOW_MS } from "./viewModeChord";
import type { ParsedDiff, PRContext, ReviewPlan } from "../../lib/types";
import * as messaging from "../../lib/messaging";

const sampleAuth = {
  accessToken: "gho_test",
  tokenType: "bearer",
  scope: "repo,read:user",
  login: "octocat",
};

vi.mock("../../lib/messaging", () => ({
  submitPullRequestReview: vi.fn(),
  getGitHubAuthStatus: vi.fn(),
  startGitHubDeviceAuth: vi.fn(),
  pollGitHubDeviceAuth: vi.fn(),
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

describe("Overlay", () => {
  beforeEach(() => {
    resetStore();
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn();
    // jsdom does not implement scrollBy; ArrowDown scrolls the code column.
    Element.prototype.scrollBy = vi.fn();
    vi.mocked(messaging.submitPullRequestReview).mockReset();
    vi.mocked(messaging.submitPullRequestReview).mockResolvedValue({
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

  it("renders nothing when the review isn't open", () => {
    const { container } = render(<Overlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the full layout with the PR description unit while loading", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "loading",
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    // Title in left pane + entry in the unit list.
    expect(screen.getAllByText(PR_DESCRIPTION_UNIT_TITLE).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("This PR adds a feature.")).toBeInTheDocument();
    expect(screen.getByText(/building the rest of the walkthrough/i)).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /building the rest of the walkthrough/i })).toBeInTheDocument();
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
      diff: diffFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    expect(screen.getByLabelText(/diff summary/i)).toBeInTheDocument();
    expect(screen.getByText("src/foo.ts")).toBeInTheDocument();
    // Plan still loading — skeleton + status copy remain.
    expect(screen.getByText(/building the rest of the walkthrough/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("unit-skeleton").length).toBeGreaterThan(0);
  });

  it("shows completed units alongside skeletons while streaming", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "streaming",
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay />);

    expect(screen.getByText("Update foo")).toBeInTheDocument();
    expect(screen.getAllByTestId("unit-skeleton").length).toBeGreaterThan(0);
    expect(screen.getByText(/building the rest of the walkthrough/i)).toBeInTheDocument();
  });

  it("shows unit context without the building spinner when viewing a streamed unit", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "streaming",
      diff: diffFixture(),
      plan: planFixture(),
      prContext: prContextFixture(),
      currentUnitIndex: 1,
    });
    render(<Overlay />);

    expect(screen.getByText("because it needed updating")).toBeInTheDocument();
    expect(screen.queryByText(/building the rest of the walkthrough/i)).not.toBeInTheDocument();
  });

  it("shows keyboard shortcuts on the description unit once the walkthrough is ready", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
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
    expect(screen.queryByText(/building the rest of the walkthrough/i)).not.toBeInTheDocument();
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
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByTestId("error-message")).toHaveTextContent("Invalid API key");
    expect(screen.getByTestId("error-status-code")).toHaveTextContent("401");
    expect(screen.getByTestId("error-code")).toHaveTextContent("authentication_error");
    expect(screen.getAllByText(PR_DESCRIPTION_UNIT_TITLE).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("This PR adds a feature.")).toBeInTheDocument();

    screen.getByRole("button", { name: /^retry$/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
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
    expect(screen.getAllByText(PR_DESCRIPTION_UNIT_TITLE).length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getAllByText(PR_DESCRIPTION_UNIT_TITLE).length).toBeGreaterThanOrEqual(1);
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
    expect(
      screen.getByText(/read the author's intent before walking the code/i)
    ).toBeInTheDocument();
  });

  it("explains missing description and that the AI will infer intent", () => {
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
    expect(screen.getByTestId("description-pane-empty").textContent).toMatch(
      /author hasn't added a PR description/i
    );
    expect(screen.getByTestId("context-panel-body").textContent).toMatch(
      /rely on the AI to tell us what this PR is about/i
    );
    expect(
      screen.queryByText(/read the author's intent before walking the code/i)
    ).not.toBeInTheDocument();
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
      /author hasn't added a PR title or description/i
    );
    expect(screen.getByTestId("context-panel-body").textContent).toMatch(
      /author hasn't added a PR title or description/i
    );
    expect(screen.getByTestId("context-panel-body").textContent).toMatch(
      /rely on the AI to tell us what this PR is about from the diff/i
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
      expect(useReviewStore.getState().draftComments[0].body).toBe(
        "Please add a test",
      );
      expect(useReviewStore.getState().composerOpen).toBe(false);
      expect(screen.getByTestId("draft-comment")).toHaveTextContent(
        "Please add a test",
      );
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
      expect(useReviewStore.getState().draftComments[0].body).toBe(
        "From window handler",
      );
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
        /authenticate via GitHub/i,
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

    it("exits the overlay on Esc after the modal is closed", async () => {
      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("submit-review-modal")).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(useReviewStore.getState().isOpen).toBe(false);
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
      expect(messaging.submitPullRequestReview).toHaveBeenCalledWith(
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

    it("exits guided review from the success modal and navigates to conversation", async () => {
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
      expect(assign).toHaveBeenCalledWith(
        "https://github.com/acme/widgets/pull/1",
      );
      expect(screen.queryByTestId("review-submitted-modal")).not.toBeInTheDocument();

      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    });

    it("exits guided review with Enter while the success modal is open", async () => {
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
      vi.mocked(messaging.submitPullRequestReview).mockResolvedValueOnce({
        ok: false,
        code: "not_authenticated",
        error:
          "Connect GitHub in the extension options before submitting a review.",
      });
      seedReadyReview(0);
      render(<Overlay />);

      await openSubmitReviewModal();
      fireEvent.click(screen.getByTestId("submit-review-event-APPROVE"));
      fireEvent.click(screen.getByTestId("submit-review-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("submit-review-error")).toHaveTextContent(
          /Connect GitHub/,
        );
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
        expect(screen.getByTestId("submit-review-error")).toHaveTextContent(
          /Add a review comment/,
        );
      });
      expect(messaging.submitPullRequestReview).not.toHaveBeenCalled();
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
      expect(messaging.submitPullRequestReview).toHaveBeenCalledWith(
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
      expect(messaging.submitPullRequestReview).toHaveBeenCalledWith(
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
      expect(screen.getByTestId("submit-review-modal")).toHaveAttribute(
        "data-step",
        "choose",
      );

      fireEvent.keyDown(window, { key: "ArrowDown" });
      expect(screen.getByTestId("submit-review-event-APPROVE")).toHaveAttribute(
        "aria-selected",
        "true",
      );

      fireEvent.keyDown(window, { key: "Enter" });
      expect(screen.getByTestId("submit-review-modal")).toHaveAttribute(
        "data-step",
        "compose",
      );
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

