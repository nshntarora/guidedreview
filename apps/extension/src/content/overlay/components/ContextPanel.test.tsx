import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGitHubReviewHost } from "@extension/content/githubHost";
import { createMemoryReviewHost, setActiveReviewHost } from "../host";
import { ContextPanel } from "./ContextPanel";

beforeEach(() => {
  setActiveReviewHost(createGitHubReviewHost());
});

describe("ContextPanel error state", () => {
  it("renders status code, error code, message, and retry", () => {
    const onRetry = vi.fn();
    render(
      <ContextPanel
        unit={null}
        error={{
          message: "Rate limit exceeded",
          statusCode: 429,
          code: "rate_limit_error",
        }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/^error$/i)).toBeInTheDocument();
    expect(screen.getByTestId("error-status-code")).toHaveTextContent("429");
    expect(screen.getByTestId("error-code")).toHaveTextContent("rate_limit_error");
    expect(screen.getByTestId("error-message")).toHaveTextContent("Rate limit exceeded");

    expect(screen.getByRole("alert")).toBeInTheDocument();
    screen.getByRole("button", { name: /^retry$/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits status/code rows when only a message is present", () => {
    render(
      <ContextPanel unit={null} error={{ message: "No API key configured." }} onRetry={vi.fn()} />,
    );
    expect(screen.queryByTestId("error-status-code")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-code")).not.toBeInTheDocument();
    expect(screen.getByTestId("error-message")).toHaveTextContent("No API key configured.");
  });
});

describe("ContextPanel loading state", () => {
  it("shows primary copy and phase detail under the spinner", () => {
    render(
      <ContextPanel
        unit={null}
        loading
        loadingDetail="Extracting the diff…"
        hasTitle
        hasDescription
      />,
    );

    expect(screen.getByTestId("context-panel-loading")).toBeInTheDocument();
    expect(screen.getByText("Building a review plan")).toBeInTheDocument();
    expect(screen.getByTestId("context-panel-loading-detail")).toHaveTextContent(
      "Extracting the diff…",
    );
    expect(screen.getByRole("status", { name: /building a review plan/i })).toBeInTheDocument();
  });
});

describe("ContextPanel needs-provider state", () => {
  it("renders the connect-provider prompt with its illustration", () => {
    render(<ContextPanel unit={null} needsProvider />);

    expect(screen.getByTestId("connect-provider-prompt")).toBeInTheDocument();
    expect(screen.getByTestId("connect-provider-art")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /connect an ai provider/i })).toBeInTheDocument();
  });

  it("opens the options page from the CTA", async () => {
    render(<ContextPanel unit={null} needsProvider />);

    screen.getByTestId("connect-provider-open-settings").click();

    await vi.waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "OPEN_OPTIONS" });
    });
  });

  it("links Setup docs to the configure-provider docs", () => {
    render(<ContextPanel unit={null} needsProvider />);

    const setupDocs = screen.getByTestId("connect-provider-learn-more");
    expect(setupDocs).toHaveAttribute("href", "https://guidedreview.dev/docs/configure-provider");
    expect(setupDocs).toHaveAttribute("target", "_blank");
    expect(setupDocs).toHaveAttribute("rel", "noopener noreferrer");
    expect(setupDocs).toHaveTextContent(/setup docs/i);
  });

  it("takes precedence over an error so no red error box is shown", () => {
    render(
      <ContextPanel unit={null} needsProvider error={{ message: "boom" }} onRetry={vi.fn()} />,
    );

    expect(screen.getByTestId("connect-provider-prompt")).toBeInTheDocument();
    expect(screen.queryByTestId("context-panel-error")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^retry$/i })).not.toBeInTheDocument();
  });
});

describe("ContextPanel structure trigger", () => {
  it("offers Structure with AI on the local summary card", () => {
    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
      }),
    );
    const onStructureReview = vi.fn();
    render(
      <ContextPanel unit={null} hasTitle hasDescription onStructureReview={onStructureReview} />,
    );

    expect(screen.getByText(/one unit per file until you structure it/i)).toBeInTheDocument();
    screen.getByTestId("structure-review").click();
    expect(onStructureReview).toHaveBeenCalledTimes(1);
  });

  it("hides the trigger after the review is structured", () => {
    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
      }),
    );
    render(
      <ContextPanel unit={null} hasTitle hasDescription onStructureReview={vi.fn()} structured />,
    );
    expect(screen.queryByTestId("structure-review")).not.toBeInTheDocument();
  });

  it("shows structure prompt and shortcuts on empty-context file units", () => {
    setActiveReviewHost(
      createMemoryReviewHost({
        kind: "local",
        exportNotes: vi.fn(),
        submit: undefined,
      }),
    );
    const onStructureReview = vi.fn();
    render(
      <ContextPanel
        unit={{
          id: "file-0-src/foo.ts",
          title: "src/foo.ts",
          kind: "change",
          context: "",
          files: [{ fileId: "src/foo.ts", hunkIds: [], role: "core_logic" }],
        }}
        hasTitle
        hasDescription
        onStructureReview={onStructureReview}
      />,
    );

    expect(screen.getByText(/one unit per file until you structure it/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/keyboard shortcuts/i)).toBeInTheDocument();
    screen.getByTestId("structure-review").click();
    expect(onStructureReview).toHaveBeenCalledTimes(1);
  });
});
