import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContextPanel } from "./ContextPanel";

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

  it("links Learn more to the configure-provider docs", () => {
    render(<ContextPanel unit={null} needsProvider />);

    const learnMore = screen.getByTestId("connect-provider-learn-more");
    expect(learnMore).toHaveAttribute("href", "https://guidedreview.dev/docs/configure-provider");
    expect(learnMore).toHaveAttribute("target", "_blank");
    expect(learnMore).toHaveAttribute("rel", "noopener noreferrer");
    expect(learnMore).toHaveTextContent(/learn more/i);
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
