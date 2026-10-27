import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGitHubReviewHost } from "@extension/content/githubHost";
import { setActiveReviewHost } from "@guided-review/ui/review/host";
import { ContextPanel } from "@guided-review/ui/review/components/ContextPanel";

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
    expect(screen.getByText("Building the walkthrough")).toBeInTheDocument();
    expect(screen.getByTestId("context-panel-loading-detail")).toHaveTextContent(
      "Extracting the diff…",
    );
    expect(screen.getByRole("status", { name: /building the walkthrough/i })).toBeInTheDocument();
  });
});

describe("ContextPanel commentary", () => {
  it("retains guidance without setup or generation actions", () => {
    render(<ContextPanel unit={null} />);
    expect(screen.getByLabelText(/keyboard shortcuts/i)).toBeInTheDocument();
    expect(screen.queryByTestId("connect-provider-prompt")).not.toBeInTheDocument();
    expect(screen.queryByTestId("generate-review-plan")).not.toBeInTheDocument();
  });
});
