import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Overlay } from "./Overlay";
import { useReviewStore } from "./store";
import { PR_DESCRIPTION_UNIT_TITLE } from "./displayUnits";
import type { ParsedDiff, PRContext, ReviewPlan } from "../../lib/types";

const PR_URL = "https://github.com/acme/widgets/pull/1";

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
    url: PR_URL,
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
  });
}

describe("Overlay", () => {
  beforeEach(() => {
    resetStore();
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn();
  });

  it("renders nothing when the review isn't open", () => {
    const { container } = render(<Overlay prUrl={PR_URL} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the full layout with the PR description unit while loading", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "loading",
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay prUrl={PR_URL} />);

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
    render(<Overlay prUrl={PR_URL} />);

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
    render(<Overlay prUrl={PR_URL} />);

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
    render(<Overlay prUrl={PR_URL} />);

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
    render(<Overlay prUrl={PR_URL} />);

    expect(screen.getByLabelText(/keyboard shortcuts/i)).toBeInTheDocument();
    expect(screen.getByText(/previous \/ next step/i)).toBeInTheDocument();
    expect(screen.getByText(/scroll the code pane/i)).toBeInTheDocument();
    expect(screen.getByText(/exit the review/i)).toBeInTheDocument();
    expect(screen.queryByText(/building the rest of the walkthrough/i)).not.toBeInTheDocument();
  });

  it("shows the error in the context panel without collapsing the layout", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "error",
      error: "Network error",
      prContext: prContextFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay prUrl={PR_URL} />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getAllByText(PR_DESCRIPTION_UNIT_TITLE).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("This PR adds a feature.")).toBeInTheDocument();
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
    render(<Overlay prUrl={PR_URL} />);
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
    render(<Overlay prUrl={PR_URL} />);
    expect(screen.getAllByText(PR_DESCRIPTION_UNIT_TITLE).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Update foo")).toBeInTheDocument();
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
    render(<Overlay prUrl={PR_URL} />);
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
    render(<Overlay prUrl={PR_URL} />);
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
    render(<Overlay prUrl={PR_URL} />);

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
    render(<Overlay prUrl={PR_URL} />);

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
    render(<Overlay prUrl={PR_URL} />);

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
});

