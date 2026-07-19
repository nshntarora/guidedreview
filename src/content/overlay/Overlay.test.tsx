import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Overlay } from "./Overlay";
import { useReviewStore } from "./store";
import type { ParsedDiff, ReviewPlan } from "../../lib/types";

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

function resetStore(): void {
  useReviewStore.setState({
    isOpen: false,
    status: "idle",
    error: null,
    diff: null,
    plan: null,
    prContext: null,
    currentUnitIndex: 0,
  });
}

describe("Overlay", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders nothing when the review isn't open", () => {
    const { container } = render(<Overlay prUrl={PR_URL} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading state while the review is loading", () => {
    useReviewStore.setState({ isOpen: true, status: "loading" });
    render(<Overlay prUrl={PR_URL} />);
    expect(screen.getByText(/reading the diff/i)).toBeInTheDocument();
  });

  it("shows the error message when the review failed", () => {
    useReviewStore.setState({ isOpen: true, status: "error", error: "Network error" });
    render(<Overlay prUrl={PR_URL} />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows a message when the plan has no units", () => {
    useReviewStore.setState({ isOpen: true, status: "ready", diff: diffFixture(), plan: { units: [] } });
    render(<Overlay prUrl={PR_URL} />);
    expect(screen.getByText(/no review units were generated/i)).toBeInTheDocument();
  });

  it("renders the current unit's title and context when ready", () => {
    useReviewStore.setState({
      isOpen: true,
      status: "ready",
      diff: diffFixture(),
      plan: planFixture(),
      currentUnitIndex: 0,
    });
    render(<Overlay prUrl={PR_URL} />);
    expect(screen.getByText("Update foo")).toBeInTheDocument();
    expect(screen.getByText("because it needed updating")).toBeInTheDocument();
  });
});
